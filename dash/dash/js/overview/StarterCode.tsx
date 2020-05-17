import React from "react";
import { Tab, Row, Col, Nav } from "react-bootstrap";

export default function StarterCode() {
  return (
    <Tab.Container
      id="individual-code-view-tabs"
      defaultActiveKey="first"
    >
      <Row>
        <Col sm={3}>
          <Nav variant="pills" className="flex-column">
            <Nav.Item>
              <Nav.Link eventKey="first">Really long file 1</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="second">File 2</Nav.Link>
            </Nav.Item>
          </Nav>
        </Col>
        <Col sm={9}>
          <Tab.Content>
            <Tab.Pane eventKey="first">
              <p>This is starter file 1.</p>
            </Tab.Pane>
            <Tab.Pane eventKey="second">
              <p>This is starter file 2.</p>
            </Tab.Pane>
          </Tab.Content>
        </Col>
      </Row>
    </Tab.Container>
  );
}
