import React from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync } from "@fortawesome/free-solid-svg-icons";
import { Container, Row, Col, Button } from "react-bootstrap";
import { Link } from "react-router-dom";


export default function Dashboard() {
    return (
      <Container fluid className="py-2">
        <Row className="border-bottom">
          <h3 className="w-100 text-center">Instructor Dashboard</h3>
        </Row>
        <Row>
        <div className="col-lg-7 col-md-12">
          <fieldset className="border rounded p-2 ">
            <legend className="w-auto">All Excercises</legend>
            <Container>
              <Row className="mb-2">
                <Col className="border rounded">EECS 280</Col>
              </Row>
              <Row className="mb-2">
                <Col className="border rounded">EECS 101</Col>
              </Row>
              <Row className="mb-2">
                <Col className="border rounded">EECS 183</Col>
              </Row>
            </Container>
          </fieldset>
        </div>
        <div className="col-lg-5 col-md-12">
          <fieldset className="border rounded p-2 ">
            <legend className="w-auto">Pending Excercises</legend>
          </fieldset>
        </div>
        </Row>
      </Container>





    );
  }




  

  
  // export default function Overview() {
  //   return (
  //     <Container fluid className="py-2">
        // <Row className="mt-3 pb-1">
        //   <Col md={12} lg={4}>
        //     <div className="d-flex justify-content-between">
        //       <Button>Start Exercise</Button>
        //       <div className="d-flex align-items-center">
        //         <span className="pr-1">Last Updated: 4:17 pm</span>
        //         <Button variant="outline-success">
        //           <FontAwesomeIcon icon={faSync} />
        //         </Button>
        //       </div>
        //     </div>
        //     <LeftPanel />
        //   </Col>
        //   <Col md={12} lg={8}>
        //     <CodeViewer students={['cmfh', 'cmfh2', 'cmfh3', 'cmfh4', 'cmfh5', 'cmfh6', 'cmfh7', 'cmfh8', 'cmfh9', 'cmfh10']} />
        //   </Col>
        // </Row>
  //     </Container>
  //   );
  // }
  