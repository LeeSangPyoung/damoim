import React from 'react';
import { Text, Linking, TextStyle } from 'react-native';

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

interface Props {
  children: string;
  style?: TextStyle;
  linkColor?: string;
}

export default function LinkedText({ children, style, linkColor = '#1d4ed8' }: Props) {
  const parts = children.split(URL_REGEX);
  if (parts.length === 1) return <Text style={style}>{children}</Text>;

  return (
    <Text style={style}>
      {parts.map((part, i) =>
        URL_REGEX.test(part) ? (
          <Text
            key={i}
            style={{ color: linkColor, textDecorationLine: 'underline' }}
            onPress={() => Linking.openURL(part)}
          >
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        )
      )}
    </Text>
  );
}
