import React from "react";

import { Container, Row, Col, Button, ProgressBar } from "react-bootstrap";

export default function LeftPanel() {
  return (
    <div>
      <fieldset className="border rounded p-2 my-2">
        <legend className="w-auto">Summary</legend>
        <Container>
          <Row>
            <Col>Students Active:</Col>
            <Col>152</Col>
          </Row>
          <Row>
            <Col>Exercise Time:</Col>
            <Col>2:17 minutes</Col>
          </Row>
          <Row>
            <Col>Overall</Col>
            <Col className="my-auto">
              <ProgressBar striped variant="warning" now={60} />
            </Col>
            <Col xs="auto">60%</Col>
          </Row>
        </Container>
      </fieldset>

      <fieldset className="border rounded p-2 my-2">
        <legend className="w-auto">Checkpoints</legend>
        <Container>
          <Row>
            <Col>1. Part 1</Col>
            <Col className="my-auto">
              <ProgressBar striped variant="success" now={90} />
            </Col>
            <Col xs="auto">90%</Col>
          </Row>
          <Row>
            <Col>2. Part 2</Col>
            <Col className="my-auto">
              <ProgressBar striped variant="warning" now={60} />
            </Col>
            <Col xs="auto">60%</Col>
          </Row>
          <Row>
            <Col>3. Part 3</Col>
            <Col className="my-auto">
              <ProgressBar striped variant="danger" now={30} />
            </Col>
            <Col xs="auto">30%</Col>
          </Row>
        </Container>
      </fieldset>
    </div>
  );
}
