import React from 'react';
import { Container, Row } from "react-bootstrap";
import AllActivities from "./AllActivities";
import ActiveSessions from "./ActiveSessions";
import ArchivedSessions from "./ArchivedSessions";


export default function Dashboard() {
    return (
      <Container fluid className="py-2">
        <Row className="border-bottom">
          <h3 className="w-100 text-center">Instructor Dashboard</h3>
        </Row>
        <Row>
        <AllActivities courses={[{'name':'EECS 280', 'activities':['Activity 1', 'Activity 2']},
                              {'name':'EECS 183', 'activities':['Activity 3']},
                              {'name':'EECS 101', 'activities':['Activity 5', 'Activity 6', 'Activity 7']},
                              {'name': 'EECS 491', 'activities': []}
                              ]} />
        <ActiveSessions
          activities={[{'courseName': 'EECS 280', 'activity': 'Activity 2'},
                      {'courseName': 'EECS 101', 'activity': 'Activity 18'}
          ]}/>
        </Row>
        <Row>
        <ArchivedSessions
          activities={[{'courseName': 'EECS 280', 'activity': 'Activity 2'},
                      {'courseName': 'EECS 101', 'activity': 'Activity 18'}
          ]}/>
        </Row>
      </Container>

    );
  }
