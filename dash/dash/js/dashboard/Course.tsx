import React from "react";
import { Button, Card, Accordion } from "react-bootstrap";


import Activity from "./Activity";
 
interface Props {
    name: string,
    activities: string[]
}
  
class Course extends React.Component<Props> {
    constructor(props: Props) {
        super(props);

      }
    
      render() {
        const { name, activities } = this.props;
        return (
                <Card>
                <Accordion.Toggle as={Card.Header} eventKey={name}>
                    {name}
                </Accordion.Toggle>
                <Accordion.Collapse eventKey={name}>
                    <Card.Body>
                        {activities.map((activity) => {
                            return(
                            <Activity 
                            key={activity}
                            activity={activity}
                        />
                        );
                        })}
                    </Card.Body>
                </Accordion.Collapse>
            </Card>

    );
    }
}






export default Course;
