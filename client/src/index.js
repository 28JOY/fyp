import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import Dashboard from './dashboard'; // ⬅️ Import Dashboard
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

ReactDOM.render(
  <Router>
    <Switch>
      <Route exact path="/" component={App} />
      <Route path="/dashboard" component={Dashboard} />
    </Switch>
  </Router>,
  document.getElementById('root')
);
