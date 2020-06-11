import React from "react";
import { Container, Accordion } from "react-bootstrap";
import Course from "./Course";



interface Props {
    courses: Array<{name: string, activities: string[]}>
  }
  
  class LeftPanel extends React.Component<Props> {
    constructor(props: Props) {
      super(props);
    }
  

  render() {
    const { courses } = this.props;
    return (
      <div>
        <fieldset className="border rounded p-2">
          <legend className="w-auto">All Excercises</legend>
          <Container>
            <Accordion defaultActiveKey="0">
                {courses.map((course) => {
                return (
                    <Course 
                    key={course.name}
                    name={course.name}
                    activities={course.activities}
                    />
                
                );
                })}
          </Accordion>
          </Container>
        </fieldset>
      </div>
    );
  }
}

export default LeftPanel;