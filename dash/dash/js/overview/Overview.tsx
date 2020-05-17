import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync } from "@fortawesome/free-solid-svg-icons";
import { Container, Row, Col, Button } from "react-bootstrap";
import { Link } from "react-router-dom";
import LeftPanel from "./LeftPanel";
import CodeViewer from "./CodeViewer";

export default function Overview() {
  return (
    <Container fluid className="py-2">
      <Row className="border-bottom">
        <Col className="d-none d-lg-block">
          <div className="text-center position-relative">
            <div className="position-absolute">
              <Link to="/dashboard">
                <Button variant="light">Back to dashboard</Button>
              </Link>
            </div>
            <h3 className="w-100 text-center">Exercise 3.1 - largest()</h3>
          </div>
        </Col>
        <Col className="d-xs-block d-lg-none" >
            <Link to="/dashboard">
              <Button variant="light">Back to dashboard</Button>
            </Link>
        </Col>
        <Col className="d-xs-block d-lg-none">
            <h3 className="w-100 text-center">Exercise 3.1 - largest()</h3>
        </Col>
      </Row>
      <Row className="mt-3 pb-1">
        <Col md={12} lg={4}>
          <div className="d-flex justify-content-between">
            <Button>Start Exercise</Button>
            <div className="d-flex align-items-center">
              <span className="pr-1">Last Updated: 4:17 pm</span>
              <Button variant="outline-success">
                <FontAwesomeIcon icon={faSync} />
              </Button>
            </div>
          </div>
          <LeftPanel />
        </Col>
        <Col md={12} lg={8}>
          <CodeViewer />
        </Col>
      </Row>
    </Container>
  );
}
