import React from "react";
import { Tab, Row, Col, Nav } from "react-bootstrap";


 
interface Props {
    activity: string
}
  
class Activity extends React.Component<Props> {
    constructor(props: Props) {
        super(props);

      }
    
      render() {
        const { activity } = this.props;
        return (
            <fieldset className="border rounded p-2 ">
                {activity}
            </fieldset>
            );
        }
    };
        

export default Activity;

