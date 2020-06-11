import React from "react";
import { Row, Container, Accordion, Card} from "react-bootstrap";
import Course from "./Course";


interface Props {
  courses: Array<{name: string, activities: string[]}>
}

class AllActivities extends React.Component<Props> {
  constructor(props: Props) {
    super(props);
  }

  render() {
    const { courses } = this.props;
    return ( 
      <div className="col-lg-7 col-md-12">
        <fieldset className="border rounded p-2 ">
          <legend className="w-auto">All Excercises</legend>
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
          </fieldset>
      </div>
    );
  }
  
}

export default AllActivities;
            