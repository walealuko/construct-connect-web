// src/components/ProfileCard.jsx
import React from "react";
import { Card, CardContent, Heading, Text } from "@aws-amplify/ui-react";

export default function ProfileCard({ user }) {
  return (
    <Card variation="outlined">
      <CardContent>
        <Heading level={4}>{user?.name}</Heading>
        <Text>{user?.email}</Text>
      </CardContent>
    </Card>
  );
}