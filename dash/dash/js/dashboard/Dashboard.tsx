import React from 'react';
import { Container, Row, Col} from "react-bootstrap";
import LeftPanel from "./left-panel/LeftPanel";
import RightPanel from "./right-panel/RightPanel";
import ArchivedSessions from "./right-panel/ArchivedSessions";


export default function Dashboard() {
    return (
      <Container fluid className="py-2">
        <Row className="border-bottom">
          <h3 className="w-100 text-center">Instructor Dashboard</h3>
        </Row>
        <Row>
        <Col md={12} lg={6}>
        <LeftPanel courses={[{'name':'EECS 280', 'activities':['Activity 1', 'Activity 2']},
                              {'name':'EECS 183', 'activities':['Activity 3']},
                              {'name':'EECS 101', 'activities':['Activity 5', 'Activity 6', 'Activity 7']},
                              {'name': 'EECS 491', 'activities': []}
                              ]} />
        </Col>
        <Col md={12} lg={6}>
        <RightPanel 
          sessions={[{'courseName': 'EECS 280', 'activity': 'Activity 2', 'sessionId' : '1234'},
                      {'courseName': 'EECS 101', 'activity': 'Activity 18', 'sessionId' : '5678'},
                      {'courseName': 'EECS 101', 'activity': 'Activity 33', 'sessionId' : '91112'},
                      {'courseName': 'EECS 183', 'activity': 'Activity 75', 'sessionId' : '13141'},
                      {'courseName': 'EECS 280', 'activity': 'Activity 24', 'sessionId' : '5161'},

          ]}/>
        </Col>
        </Row>
      </Container>

      

    );
  }
