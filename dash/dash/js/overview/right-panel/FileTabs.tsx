import React from "react";
import { Tab, Row, Col, Nav, Button } from "react-bootstrap";
import FileView from "./FileView";

interface Props {
  baseUrl: string;
  fileList: string[];
}

interface State {}

class FileTabs extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.goToLobster = this.goToLobster.bind(this);
  }

  goToLobster() {
    alert("This is where I would send you to lobster");
  }

  render() {
    const { fileList, baseUrl } = this.props;

    const tabs = (
      <Nav variant="pills" className="flex-column overflow-auto">
        <div className="mb-3 border-bottom">
          <Button
            variant="outline-primary"
            className="mb-3 w-100"
            onClick={this.goToLobster}
          >
            Open in Lobster
          </Button>
        </div>
        {fileList.map((filename, idx) => (
          <Nav.Item key={idx}>
            <Nav.Link eventKey={idx}>{filename}</Nav.Link>
          </Nav.Item>
        ))}
      </Nav>
    );
    const tabContent = (
      <Tab.Content>
        {fileList.map((filename, idx) => (
          <FileView key={idx} eventKey={idx} fileUrl={baseUrl + filename} />
        ))}
      </Tab.Content>
    );

    const fullSizeLayout = (
      <Row className="h-100 d-none d-sm-flex">
        <Col sm={3} className="d-flex flex-column h-100">
          {tabs}
        </Col>
        <Col sm={9} className="d-flex flex-column h-100">
          {tabContent}
        </Col>
      </Row>
    );

    const smallLayout = (
      <Row className="h-100 d-xs-flex d-sm-none">
        <Col sm={3} className="d-flex flex-column h-25">
          {tabs}
        </Col>
        <Col sm={9} className="d-flex flex-column h-75">
          {tabContent}
        </Col>
      </Row>
    );

    return (
      <Tab.Container
        id="individual-code-view-tabs"
        transition={false}
        defaultActiveKey={0}
      >
        {fullSizeLayout}
        {smallLayout}
      </Tab.Container>
    );
  }
}

export default FileTabs;
