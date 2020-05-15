import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSync } from '@fortawesome/free-solid-svg-icons'
import { Container, Row, Col, Button, ProgressBar, Nav, NavDropdown } from 'react-bootstrap';

export default function Overview() {
  return (
    <Container fluid className="py-2">
      <Row className="border-bottom">
        <Col>
          <div className="text-center position-relative">
            <div className="position-absolute">
              <Button variant="light">Back</Button>
            </div>
            <h3 className="w-100 text-center">
              Exercise 3.1 - largest()
            </h3>
          </div>
        </Col>
      </Row>
      <Row className="mt-3">
        <Col>
          <div className="d-flex justify-content-between">
            <Button>Start Exercise</Button>
            <div className="d-flex align-items-center">
              <span className="pr-1">Last Updated: 4:17 pm</span>
              <Button variant="outline-success">
                <FontAwesomeIcon icon={faSync} />
              </Button>
            </div>
          </div>

          <fieldset className="border p-2 my-2">
            <legend className="w-auto">Summary</legend>
            <Container>
              <Row>
                <Col>
                  Students Active:
                </Col>
                <Col>
                  152
                </Col>
              </Row>
              <Row>
                <Col>
                  Exercise Time:
                </Col>
                <Col>
                  2:17 minutes
                </Col>
              </Row>
              <Row>
                <Col>
                  Overall
                </Col>
                <Col className="my-auto">
                  <ProgressBar striped variant="warning" now={60} />
                </Col>
                <Col xs="auto">
                  60%
                </Col>
              </Row>
            </Container>
          </fieldset>

          <fieldset className="border p-2 my-2">
            <legend className="w-auto">Checkpoints</legend>
            <Container>
              <Row>
                <Col>
                  1. Part 1
                </Col>
                <Col className="my-auto">
                  <ProgressBar striped variant="success" now={90} />
                </Col>
                <Col xs="auto">
                  90%
                </Col>
              </Row>
              <Row>
                <Col>
                  2. Part 2
                </Col>
                <Col className="my-auto">
                  <ProgressBar striped variant="warning" now={60} />
                </Col>
                <Col xs="auto">
                  60%
                </Col>
              </Row>
              <Row>
                <Col>
                  3. Part 3
                </Col>
                <Col className="my-auto">
                  <ProgressBar striped variant="danger" now={30} />
                </Col>
                <Col xs="auto">
                  30%
                </Col>
              </Row>

            </Container>
          </fieldset>

        </Col>
        <Col>
          <fieldset className="border p-2 h-100">
            <legend className="w-auto">Code</legend>
            <Nav variant="tabs" activeKey="1" onSelect={(e) => alert(e)}>
              <Nav.Item>
                <Nav.Link eventKey="1" href="#/home">
                  Student Solutions
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="2" title="Item">
                  Starter Code
                </Nav.Link>
              </Nav.Item>
              <NavDropdown title="Solutions" id="nav-dropdown">
                <NavDropdown.Item eventKey="4.1">Student 1</NavDropdown.Item>
                <NavDropdown.Item eventKey="4.2">Student 2</NavDropdown.Item>
                <NavDropdown.Item eventKey="4.3">Student 3</NavDropdown.Item>
              </NavDropdown>
            </Nav>
            <div className="overflow-auto">
              <Container>
                <Row>
                  <Col>
                    Hi
                  </Col>
                  <Col>
                    Hello
                  </Col>
                  <Col>
                    Howdy
                  </Col>
                </Row>
                <Row>
                  <Col>
                    Rad
                  </Col>
                  <Col>
                    Cool
                  </Col>
                  <Col>
                    Awesome
                  </Col>
                </Row>
                <Row>
                  <Col>
                    Goodbye
                  </Col>
                  <Col>
                    Later
                  </Col>
                  <Col>
                    See ya!
                  </Col>
                </Row>
              </Container>
            </div>
          </fieldset>

        </Col>
      </Row>
    </Container>
  );
}