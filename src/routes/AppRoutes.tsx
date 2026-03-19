import React from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import Home from '../pages/Home';
import RoadmapPage from '../pages/RoadmapPage';
import SubscriptionPage from '../pages/SubscriptionPage';
import Login from '../components/Login';
import Register from '../components/Register';
import { Route as RouteType } from '../types/Route';
import { User } from '../types/User';

const routes: RouteType[] = [
  { path: '/', component: Home, exact: true },
  { path: '/roadmap', component: RoadmapPage, isPrivate: true },
  { path: '/subscription', component: SubscriptionPage, isPrivate: true },
  { path: '/login', component: Login },
  { path: '/register', component: Register }
];

export const generateRoutes = (user: User | null): RouteType[] => {
  return routes.map((route) => {
    if (route.isPrivate && !user) {
      return { ...route, component: () => <Redirect to="/login" /> };
    }
    return route;
  });
};

const AppRoutes: React.FC<{ user: User | null }> = ({ user }) => {
  const accessibleRoutes = generateRoutes(user);
  
  return (
    <Router>
      <Switch>
        {accessibleRoutes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            exact={route.exact}
            component={route.component}
          />
        ))}
        <Route path="*">
          <h1>404 - Página não encontrada</h1>
        </Route>
      </Switch>
    </Router>
  );
};

export default AppRoutes;