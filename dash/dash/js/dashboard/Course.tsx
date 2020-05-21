import React from "react";
import { Button, Card, Accordion } from "react-bootstrap";


import Activity from "./Activity";
 
interface Props {
    name: string,
    activities: string[]
}

interface State {
    hovering: boolean;
  }
  
class Course extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
            hovering: false,
          };
      
          this.handleMouseEnter = this.handleMouseEnter.bind(this);
          this.handleMouseExit = this.handleMouseExit.bind(this);
      }

      handleMouseEnter(e: React.MouseEvent<HTMLDivElement>) {
        e.preventDefault();
        this.setState({
          hovering: true,
        });
      }
    
      handleMouseExit(e: React.MouseEvent<HTMLDivElement>) {
        e.preventDefault();
        this.setState({
          hovering: false,
        });
      }
    
      render() {
        const { name, activities } = this.props;
        const { hovering } = this.state;
        return (
                <Card>
                <Accordion.Toggle 
                    as={Card.Header} 
                    eventKey={name} 
                    style={{backgroundColor: (hovering ? '#d3d3d3' : '#fff')}}
                    onMouseEnter={this.handleMouseEnter}
                    onMouseLeave={this.handleMouseExit}
                >
                    <h5>{name}</h5>  
                </Accordion.Toggle>
                <Accordion.Collapse eventKey={name}>
                    <Card.Body>
                        {activities.map((activity) => {
                            return(
                            <Activity 
                            key={activity}
                            course={name}
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
