import React from "react";
import {Button, Row, Col, Modal } from "react-bootstrap";
import { Link } from "react-router-dom";


interface Props {
    course: string,
    activity: string
}

interface State {
    show: boolean;
}
  
class Activity extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            show: false,
        };

        this.startSession = this.startSession.bind(this);
        this.closeModal = this.closeModal.bind(this);
    }

    startSession() {
        this.setState({show: true});
    }

    closeModal() {
        this.setState({show: false});
    }
    
    render() {
        const { course, activity } = this.props;

        return (
            <fieldset className="border rounded p-2 my-2">
                <Row>
                <Col sm={7}>
                    <b>{activity}</b>
                </Col>
                <Col sm={3}>
              
                    <Button variant="primary" onClick={this.startSession}>
                        Start Session
                    </Button>
                    <Modal show={this.state.show} onHide={this.closeModal} animation={true}>
                        <Modal.Header closeButton>
                            <Modal.Title>Session Details: {activity}</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>Give this session ID to your students: todo get session id </Modal.Body>
                        <Modal.Footer>
                            <Link to={"/dashboard/:sessionid"}>
                            <Button variant="secondary" onClick={this.closeModal}>
                                Overview
                            </Button>
                            </Link>
                        </Modal.Footer>
                    </Modal>     
                </Col>
                <Col sm={1}>
                    <Link to={"/dashboard/" + course + "/" + activity + "/edit"}>
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

