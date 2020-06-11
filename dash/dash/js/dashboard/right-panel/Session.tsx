import React from "react";
import { Button, Row, Col, Modal, Container } from "react-bootstrap";
import { Link } from "react-router-dom";


interface Props {
    course: string,
    activity: string,
    sessionId: string,
    displayArchived: boolean,
}

interface State {
    isActive: boolean;
}

class Session extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            isActive: false,
        };

        this.archiveSession = this.archiveSession.bind(this);

    }

    archiveSession() {
        this.setState({ isActive: false });
    }

    render() {
        const { course, activity, sessionId, displayArchived } = this.props;

        return (
            <>
                <Row>
                    <Col><b>{course}:{activity}:{sessionId}</b></Col>
                    <Col className="text-right">
                        <Button className="mx-1 my-1" variant="primary" onClick={this.archiveSession}>
                            Archive
                            </Button>
                       

                        <Link to={"/dashboard/" + sessionId }>
                            <Button className="mx-1 my-1">Overview</Button>
                        </Link>

                    </Col>
                </Row>
          
            </>
        );
    }
};



export default Session;

