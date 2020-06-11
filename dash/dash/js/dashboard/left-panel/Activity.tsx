import React from "react";
import { Button, Row, Col, Modal, Container } from "react-bootstrap";
import { Link } from "react-router-dom";


interface Props {
    course: string,
    activity: string,
}

interface State {
    showModal: boolean;
}

class Activity extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            showModal: false,
        };

        this.startSession = this.startSession.bind(this);
        this.closeModal = this.closeModal.bind(this);
    }

    startSession() {
        this.setState({ showModal: true });
    }

    closeModal() {
        this.setState({ showModal: false });
    }

    render() {
        const { course, activity } = this.props;

        return (
            <div>
                <fieldset className="border rounded p-2">
                    <legend className="w-auto">Summary</legend>
                    <Container>
                        <Row>
                            <Col><b>{activity}</b></Col>
                            <Col className="text-right">
                                <Button className="mx-1 my-1" variant="primary" onClick={this.startSession}>
                                    Start Session
                                </Button>
                                <Modal showModal={this.state.showModal} onHide={this.closeModal} animation={true}>
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

                                <Link to={"/dashboard/" + course + "/" + activity + "/edit"}>
                                    <Button className="mx-1 my-1">Edit</Button>
                                </Link>

                            </Col>
                        </Row>
                    </Container>
                </fieldset>
            </div>
        );
    }
};


export default Activity;

