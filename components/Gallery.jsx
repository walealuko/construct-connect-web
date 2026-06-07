import React from 'react';
import { Flex, View, Image, Text, Heading } from '@aws-amplify/ui-react';

// items: array of { id, title, description, imageUrl }
function Gallery({ items, title }) {
  return (
    <Flex direction="column" gap="1rem" width="100%">
      {title && <Heading level={3}>{title}</Heading>}
      <Flex wrap="wrap" justifyContent="center" gap="2rem">
        {items.map((item) => (
          <View
            key={item.id}
            width="250px"
            border="1px solid #ccc"
            borderRadius="8px"
            overflow="hidden"
          >
            <Image
              src={item.imageUrl}
              alt={item.title}
              width="100%"
              height="150px"
              objectFit="cover"
            />
            <View padding="0.5rem">
              <Heading level={5}>{item.title}</Heading>
              <Text>{item.description}</Text>
            </View>
          </View>
        ))}
      </Flex>
    </Flex>
  );
}

export default Gallery;
