import React from 'react';
import { Container, Row } from "react-bootstrap";
import AllActivities from "./AllActivities";


export default function Dashboard() {
    return (
      <Container fluid className="py-2">
        <Row className="border-bottom">
          <h3 className="w-100 text-center">Instructor Dashboard</h3>
        </Row>
        <Row>
        <AllActivities courses={[{'EECS 280': ['Activity 1']}]}/>
        <div className="col-lg-5 col-md-12">
          <fieldset className="border rounded p-2 ">
            <legend className="w-auto">Pending Excercises</legend>
          </fieldset>
        </div>
        </Row>
      </Container>

    );
  }
