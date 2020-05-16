import React from "react";
import { Tabs, Tab, Container, Col, Row } from "react-bootstrap";
import StarterCode from "./StarterCode";
import CodeCard from "./CodeCard";

export default function CodeViewer() {
  return (
    <fieldset className="border p-2 mh-100">
      <legend className="w-auto">Code</legend>
      <Tabs defaultActiveKey="home" transition={false} id="noanim-tab-example">
        <Tab eventKey="home" title="Student Solutions">
          <Container className="d-none d-lg-block">
            <Row className="py-2">
              <Col>
                <CodeCard />
              </Col>
              <Col>
                <CodeCard />
              </Col>
              <Col>
                <CodeCard />
              </Col>
            </Row>
            <Row className="py-2">
              <Col>
                <CodeCard />
              </Col>
              <Col>
                <CodeCard />
              </Col>
              <Col>
                <CodeCard />
              </Col>
            </Row>
            <Row className="py-2">
              <Col>
                <CodeCard />
              </Col>
              <Col>
                <CodeCard />
              </Col>
              <Col>
                <CodeCard />
              </Col>
            </Row>
            <Row className="py-2">
              <Col>
                <CodeCard />
              </Col>
              <Col>
                <CodeCard />
              </Col>
              <Col>
                <CodeCard />
              </Col>
            </Row>
            <Row className="py-2">
              <Col>
                <CodeCard />
              </Col>
              <Col>
                <CodeCard />
              </Col>
              <Col>
                <CodeCard />
              </Col>
            </Row>
            <Row className="py-2">
              <Col>
                <CodeCard />
              </Col>
              <Col>
                <CodeCard />
              </Col>
              <Col>
                <CodeCard />
              </Col>
            </Row>
          </Container>
          <Container className="d-none d-sm-block d-lg-none">
            <Row className="py-2">
              <Col>
                <CodeCard />
              </Col>
              <Col>
                <CodeCard />
              </Col>
            </Row>
            <Row className="py-2">
              <Col>
                <CodeCard />
              </Col>
              <Col>
                <CodeCard />
              </Col>
            </Row>
            <Row className="py-2">
              <Col>
                <CodeCard />
              </Col>
              <Col>
                <CodeCard />
              </Col>
            </Row>
            <Row className="py-2">
              <Col>
                <CodeCard />
              </Col>
              <Col>
                <CodeCard />
              </Col>
            </Row>
            <Row className="py-2">
              <Col>
                <CodeCard />
              </Col>
              <Col>
                <CodeCard />
              </Col>
            </Row>
            <Row className="py-2">
              <Col>
                <CodeCard />
              </Col>
              <Col>
                <CodeCard />
              </Col>
            </Row>
          </Container>
          <Container className="d-xs-block d-sm-none">
            <Row className="py-2">
              <Col>
                <CodeCard />
              </Col>
            </Row>
            <Row className="py-2">
              <Col>
                <CodeCard />
              </Col>
            </Row>
            <Row className="py-2">
              <Col>
                <CodeCard />
              </Col>
            </Row>
            <Row className="py-2">
              <Col>
                <CodeCard />
              </Col>
            </Row>
            <Row className="py-2">
              <Col>
                <CodeCard />
              </Col>
            </Row>
            <Row className="py-2">
              <Col>
                <CodeCard />
              </Col>
            </Row>
          </Container>
        </Tab>
        <Tab eventKey="profile" title="Starter Code">
          <StarterCode />
        </Tab>
      </Tabs>
    </fieldset>
  );
}
