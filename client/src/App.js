import React, { Component } from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import UserProfile from './UserProfile';
import PhotoForm from './PhotoForm';
import TitleBar from './TitleBar'
import Home from './Home';
import CssBaseline from '@material-ui/core/CssBaseline';
import OpenIconSpeedDial from './OpenIconSpeedDial';
import About from './About';
import Playlist from './Playlist';
import LoginSignup from './LoginSignup';

class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      token: '',
      user: null,
      lockedResult: '',
      playlist: [],
      spotifyToken: '',
      imgURL: '',
      genres: [],
      cloudColors: [],
      spfyAtts: []
    }
    this.checkForLocalToken = this.checkForLocalToken.bind(this);
    this.checkForSpotifyToken = this.checkForSpotifyToken.bind(this);
    this.logout = this.logout.bind(this);
    this.liftTokenToState = this.liftTokenToState.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handlePlaylist = this.handlePlaylist.bind(this);
    this.handlePhoto = this.handlePhoto.bind(this);
    this.handleColors = this.handleColors.bind(this);
    this.handleGenres = this.handleGenres.bind(this);
    this.handleAtts = this.handleAtts.bind(this);
  }

  liftTokenToState(data) {
    this.setState({
      token: data.token,
      user: data.user
    })
  }

  handleClick(e) {
    e.preventDefault();
    axios.defaults.headers.common['Authorization'] = `Bearer ${this.state.token}`;
    axios.get('/locked/test').then(results => {
      this.setState({
        lockedResult: results.data
      })
    })
  }


  componentDidMount() {
    this.checkForLocalToken();
    this.checkForSpotifyToken()
  }

  logout() {
    // remove token from local storage
    localStorage.removeItem('mernToken');
    // remove info from state
    this.setState({
      token: '',
      user: null
    })
  }

  checkForSpotifyToken() {
    //Look for Spotify token in local storage
    let spotifyToken = localStorage.getItem('spotifyToken');
    if (!spotifyToken || spotifyToken == 'undefined') {
      // There was no token
      // clear out anything weird that might be there
      localStorage.removeItem('spotifyToken')
      this.setState({
        spotifyToken: '',
      })
      // we need to call the Spotify API on the back end and get a token
      axios.post('/auth/get/spotify/token').then(results => {
        // put the token in local storage
        localStorage.setItem('spotifyToken', results.data.access_token);
        this.setState({
          spotifyToken: results.data.access_token,
        })
      }).catch(err => console.log(err))
    }
  }


  checkForLocalToken() {
    //Look for token in local storage
    let token = localStorage.getItem('mernToken');
    if (!token) {
      // There was no token
      // remove mernToken from local storage just in case corrupted, replaced etc
      localStorage.removeItem('mernToken')
      this.setState({
        token: '',
        user: null
      })
    } else {
      // token found in local storage
      // send it to the back to be verified
      axios.post('/auth/me/from/token', {
        token
      }).then(results => {
        // put the token in local storage
        localStorage.setItem('mernToken', results.data.token);
        this.setState({
          token: results.data.token,
          user: results.data.user
        })
      }).catch(err => console.log(err))
    }
  }

  // ******** THESE HANDLE THE THINGS THAT NEED TO BE PASSED FROM PHOTOFORM TO RESULTS/PLAYLIST
  handlePlaylist(tracks) {
    this.setState({playlist: tracks});
  }

  handlePhoto(photo) {
    this.setState({imgURL: photo});
  }

  handleGenres(genres) {
    this.setState({genres: genres});
  }

  handleColors(colors) {
    this.setState({cloudColors: colors});
  }

  handleAtts(atts) {
    this.setState({spfyAtts: atts});
  }

  // **********************


  render() {
    let user = this.state.user;
    let userProfile = (user) ? <UserProfile user={user} logout={this.logout} /> : 'Must Log in to view profile';

    return (
     <React.Fragment>
     <CssBaseline />
      <div className="App">
        <Router>
          <div>
            <TitleBar />

            <Route exact path='/' render={() =>
               <Home user={this.state.user} />
            } />
            <Route path='/about' render={() =>
                 <About />
              } />

             <Route path='/upload' render={() =>
               <PhotoForm liftPlaylist={this.handlePlaylist}
                          liftPhoto={this.handlePhoto}
                          liftGenres={this.handleGenres}
                          liftColors={this.handleColors}
                          liftAtts={this.handleAtts}
                          refreshToken={this.checkForSpotifyToken} />
             } />



             <Route path='/profile' render={() =>
               userProfile
             } />

             <Route path='/loginsignup' render={() =>
               <LoginSignup user={user} liftToken={this.liftTokenToState} />
             } />

             <Route path='/playlist/:id' render={(props) =>
               <Playlist user={user} {...props} isFave="true" />
             } />

             <Route path='/results' render={(props) =>
               <Playlist user={user}
                         {...props}
                         isFave="false"
                         playlist={this.state.playlist}
                         spotifyToken={this.state.spotifyToken}
                         imgURL={this.state.imgURL}
                         genres={this.state.genres}
                         colors={this.state.cloudColors}
                         spfyAtts={this.state.spfyAtts}
                      />
             } />
              <OpenIconSpeedDial user={this.state.user} logout={this.logout} />
          </div>
        </Router>
      </div>
    </React.Fragment>
    )
  }
}



export default App;
