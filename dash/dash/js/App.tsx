import React from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from "react-router-dom";
import Dashboard from './dashboard/Dashboard';
import Overview from './overview/Overview';

export default function App() {
  return (
    <Router>
      <Switch>
        <Redirect exact from="/" to="/dashboard" />
        <Route exact path="/dashboard">
          <Dashboard />
        </Route>
        <Route path="/dashboard/:classid/:exerciseid/edit">
          <Edit />
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
  
  function NoMatch() {
    return <h2>Sorry, can't find it!</h2>;
  }

  function Edit() {
    return <h2>Under construction!</h2>;
  }