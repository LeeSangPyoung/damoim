package com.ourclass.backend.service;

import com.ourclass.backend.dto.GuestbookRequest;
import com.ourclass.backend.dto.GuestbookResponse;
import com.ourclass.backend.entity.Guestbook;
import com.ourclass.backend.entity.User;
import com.ourclass.backend.repository.GuestbookRepository;
import com.ourclass.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class GuestbookService {

    @Autowired
    private GuestbookRepository guestbookRepository;

    @Autowired
    private UserRepository userRepository;

    @Transactional
    public GuestbookResponse addEntry(String ownerUserId, String writerUserId, GuestbookRequest request) {
        User owner = userRepository.findByUserId(ownerUserId)
                .orElseThrow(() -> new RuntimeException("Owner not found"));

        User writer = userRepository.findByUserId(writerUserId)
                .orElseThrow(() -> new RuntimeException("Writer not found"));

        Guestbook entry = Guestbook.builder()
                .owner(owner)
                .writer(writer)
                .content(request.getContent())
                .build();

        Guestbook saved = guestbookRepository.save(entry);
        return toResponse(saved, writerUserId);
    }

    @Transactional(readOnly = true)
    public List<GuestbookResponse> getEntries(String ownerUserId, String currentUserId) {
        User owner = userRepository.findByUserId(ownerUserId)
                .orElseThrow(() -> new RuntimeException("Owner not found"));

        List<Guestbook> entries = guestbookRepository.findByOwnerOrderByCreatedAtDesc(owner);

        return entries.stream()
                .map(entry -> toResponse(entry, currentUserId))
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteEntry(Long entryId, String currentUserId) {
        Guestbook entry = guestbookRepository.findById(entryId)
                .orElseThrow(() -> new RuntimeException("Entry not found"));

        // 작성자 또는 방명록 주인만 삭제 가능
        boolean isWriter = entry.getWriter().getUserId().equals(currentUserId);
        boolean isOwner = entry.getOwner().getUserId().equals(currentUserId);

        if (!isWriter && !isOwner) {
            throw new RuntimeException("Not authorized to delete this entry");
        }

        guestbookRepository.delete(entry);
    }

    @Transactional(readOnly = true)
    public long getEntryCount(String ownerUserId) {
        User owner = userRepository.findByUserId(ownerUserId)
                .orElseThrow(() -> new RuntimeException("Owner not found"));
        return guestbookRepository.countByOwner(owner);
    }

    private GuestbookResponse toResponse(Guestbook entry, String currentUserId) {
        User writer = entry.getWriter();

        boolean canDelete = false;
        if (currentUserId != null) {
            canDelete = writer.getUserId().equals(currentUserId)
                    || entry.getOwner().getUserId().equals(currentUserId);
        }

        return GuestbookResponse.builder()
                .id(entry.getId())
                .writer(GuestbookResponse.WriterInfo.builder()
                        .userId(writer.getUserId())
                        .name(writer.getName())
                        .profileImageUrl(writer.getProfileImageUrl())
                        .build())
                .content(entry.getContent())
                .createdAt(entry.getCreatedAt())
                .canDelete(canDelete)
                .build();
    }
}
