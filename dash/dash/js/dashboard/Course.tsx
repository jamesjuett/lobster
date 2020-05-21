import React from "react";
import { Tab, Row, Col, Nav } from "react-bootstrap";
import Activity from "./Activity";


interface Props {
    name: string,
    activities: string[]
}
  
export default function Course(props: Props) {
    const { name, activities } = props;
    return (
        <fieldset className="border rounded p-2 my-2">
            <div className="accordion-group">
                <div className="accordion-heading">
                    <a
                        className="accordion-toggle"
                        data-toggle="collapse"
                        data-target="#collapseTwo"
                    >
                        <fieldset>{name}</fieldset>
                    </a>
                </div>
            </div>
        </fieldset>
  
        // // todo: output name
        // {activities.map((courseActivity) => (
        //     <Activity
        //       activity={courseActivity}
        //     />
        //   ))}

       
    );
}


{/* <div id="collapseTwo" className=" collapse">
<div className="accordion-inner ml-4">
  <Row>Activity 3</Row>
  <Row>Activity 4</Row>
</div>
</div>
</div> */}



