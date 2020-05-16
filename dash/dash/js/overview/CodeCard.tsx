import React from "react";
import { Card, Button } from "react-bootstrap";

export default function CodeCard() {
  return (
    <Card >{/* className="w-33 m-2"> */}
      <Card.Header>Featured</Card.Header>
      <Card.Body>
        <Card.Title>Special title treatment</Card.Title>
        <Card.Text>
          With supporting text below as a natural lead-in to additional content.
        </Card.Text>
        <Button variant="primary">Go somewhere</Button>
      </Card.Body>
    </Card>
  );
}
