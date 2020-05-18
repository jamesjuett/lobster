import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { Button } from "react-bootstrap";

export default function CloseButton(props) {
    return (
        <Button className="close-button" variant="link" onClick={props.closeTab}>
          <FontAwesomeIcon icon={faTimes} />
        </Button>
    );
  }
