import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import Session from "./Session";




interface Props {
    sessions: Array<{ courseName: string, activity: string, sessionId: string, }>

}


class RightPanel extends React.Component<Props> {
  constructor(props: Props) {
    super(props);
   
  }

  

  render() {
    
    return (
      <div>
        <fieldset className="border rounded p-2">
          <legend className="w-auto">Active Sessions</legend>
          <Container>
          {this.props.sessions.map((session) => (
              <Session
                course={session.courseName}
                activity={session.activity}
                sessionId={session.sessionId}
                displayArchived={false}
              />
            ))}
          </Container>
        </fieldset>

        <fieldset className="border rounded p-2 my-2">
          <legend className="w-auto">Archived Sessions</legend>
          <Container>
            {this.props.sessions.map((session) => (
              <Session
                course={session.courseName}
                activity={session.activity}
                sessionId={session.sessionId}
                displayArchived={true}
              />
            ))}
          </Container>
        </fieldset>
      </div>
    );
  }
}

export default RightPanel;
