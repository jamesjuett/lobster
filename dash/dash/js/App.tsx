import React from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
  Link
} from "react-router-dom";

export default function App() {
  return (
    <Router>
      <Switch>
        <Redirect exact from="/" to="/dashboard" />
        <Route exact path="/dashboard">
          <List />
        </Route>
        <Route path="/dashboard/:classid/:exerciseid">
          <Overview />
        </Route>
        <Route>
          <NoMatch />
        </Route>
      </Switch>
    </Router>
  );
}

function List() {
    return (
      <div>
        <h2>Course A</h2>
        <Link to="/dashboard/courseA/exerciseA">Course A Ex A</Link>
        <Link to="/dashboard/courseA/exerciseB">Course A Ex B</Link>
        <h2>Course B</h2>
        <Link to="/dashboard/courseB/exerciseC">Course B Ex C</Link>
        <Link to="/dashboard/courseB/exerciseD">Course B Ex D</Link>
      </div>
    );
  }
  
  function Overview() {
    return <h2>Overview</h2>;
  }
  
  function NoMatch() {
    return <h2>Sorry, can't find it!</h2>;
  }