import React from "react";
import {Button, Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";


 
interface Props {
    course: string,
    activity: string
}
  
class Activity extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
      }
    
      render() {
        const { course, activity } = this.props;
        return (
            <fieldset className="border rounded p-2 my-2">
                <Row>
                <Col sm={8}>
                    <b>{activity}</b>
                </Col>
                <Col sm={2}>
                    <Link to="/dashboard/{course}/{activity}">
                        <Button>
                            Overview
                        </Button>
                    </Link>
                </Col>
                <Col sm={2}>
                    <Link to="/dashboard/{course}/{activity}/edit">
                        <Button>
                            Edit
                        </Button>
                    </Link>
                </Col>
                </Row>
            </fieldset>
           
            );
        }
    };
        

export default Activity;

