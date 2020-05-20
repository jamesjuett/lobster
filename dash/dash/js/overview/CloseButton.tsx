import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { Button } from "react-bootstrap";

interface Props {
  closeTab: () => void;
}

export default function CloseButton(props: Props) {
    return (
        <Button className="close-button" variant="link" onClick={props.closeTab}>
          <FontAwesomeIcon icon={faTimes} />
        </Button>
    );
  }
