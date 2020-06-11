import React from "react";
import { Button, Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";

interface Props {
  activities: Array<{ courseName: string, activity: string }>
}

export default function ArchivedActivities(props: Props) {
  const { activities } = props;
  return (
    <>
      <div className="col-lg-5 col-md-12 ml-auto">
        <fieldset className="border rounded p-2 ">
          <legend className="w-auto">Archived Sessions</legend>
          {activities.map((activity) => {
            return (
              <>
                <fieldset className="border rounded p-2 my-2">
                  <Row>
                    <Col sm={9}>
                      <b>{activity.courseName}: {activity.activity}</b>
                    </Col>
                    <Col sm={2}>
                      <Link to="/dashboard/{activity.courseName}/{activity.activity}">
                        <Button>
                          Overview
                        </Button>
                      </Link>
                    </Col>
                  </Row>
                </fieldset>

              </>
            );
          })}
        </fieldset>
      </div>
    </>
  );
}