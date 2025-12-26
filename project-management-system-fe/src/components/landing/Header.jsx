// src/components/landing/Header.jsx
import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const navigate = useNavigate();

  return (
    <Navbar expand="lg" className="navbar-transparent">
      <Container>
        <Navbar.Brand href="/">
          <span style={{color: '#1a237e'}}>Zentask</span>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="mx-auto"> {/* mx-auto để căn giữa menu */}
          </Nav>
          <Button 
            onClick={() => navigate('/login')}
            style={{backgroundColor: '#3f51b5', border: 'none', fontWeight: '600', padding: '10px 25px'}}
          >
            Go to App
          </Button>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;