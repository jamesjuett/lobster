import React from "react";
import { Tabs, Tab, Container, Col, Row } from "react-bootstrap";
import StarterCode from "./StarterCode";
import CodeCard from "./CodeCard";

export default function CodeViewer() {
  return (
    <fieldset className="border rounded p-2 ">
      <legend className="w-auto">Code</legend>
      <div className="code-view d-flex flex-column">
        <Tabs
          defaultActiveKey="solutions"
          transition={false}
          id="all-code-view-tabs"
        >
          <Tab eventKey="solutions" title="Student Solutions">
            <div className="flex-grow-1 overflow-auto">
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
            </div>
          </Tab>
          <Tab eventKey="starter-code" title="Starter Code">
            <div className="py-2 flex-row flex-grow-1">
              <StarterCode />
            </div>
          </Tab>
        </Tabs>
      </div>
    </fieldset>
  );
}
