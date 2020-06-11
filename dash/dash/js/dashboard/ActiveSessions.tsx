import React from "react";
import { Button, Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";

interface Props {
  activities: Array<{ courseName: string, activity: string }>
}

export default function ActiveSessions(props: Props) {
  const { activities } = props;
  return (
    <>
      <div className="col-lg-5 col-md-12">
        <fieldset className="border rounded p-2 ">
          <legend className="w-auto">Active Sessions</legend>
          {activities.map((activity) => {
            return (
              <>
                <fieldset className="border rounded p-2 my-2">
                  <Row>
                    <Col sm={6}>
                      <b>{activity.courseName}: {activity.activity}</b>
                    </Col>
                    <Col sm={3}>
                      <Link to={"/dashboard/" + activity.courseName + "/" + activity.activity}>
                        <Button>
                          Overview
                        </Button>
                      </Link>
                    </Col>
                    <Col sm={3}>
                        <Button>
                          Archive
                        </Button>
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
