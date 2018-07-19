import React, {Component} from 'react';
import axios from 'axios';
import convert from 'color-convert';
import {hues} from './hues';
import ColorChart from './ColorChart';
import AttsChart from './AttsChart';
import { withStyles } from '@material-ui/core/styles';
import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import Dropzone from 'react-dropzone';
import Paper from '@material-ui/core/Paper';
import AddAPhoto from '@material-ui/icons/AddAPhoto';
import Grid from '@material-ui/core/Grid';
import {withRouter} from 'react-router-dom';
import sheetmusic from './sheetmusic.jpeg';
import Button from '@material-ui/core/Button';

const styles = theme => ({
	root: {
		textAlign: 'center',
		flexGrow: 1,
	},
	paper: {
		padding: theme.spacing.unit * 2,
		margin: theme.spacing.unit * 2,
		height: '100%',
		color: theme.palette.text.secondary,
		textAlign: 'center'
	},
	button: {
		margin: theme.spacing.unit * 1
	},
	dropzone: {
		padding: theme.spacing.unit * 4,
		margin: theme.spacing.unit * 4
	}
})


class PhotoForm extends Component {
	constructor(props) {
		super(props)
		this.handleChange = this.handleChange.bind(this);
		this.handleDrop = this.handleDrop.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
		this.handleNewUploadClick = this.handleNewUploadClick.bind(this);
		// this.spotifyAttributes = this.spotifyAttributes.bind(this);
		this.calculateSpfyAtts = this.calculateSpfyAtts.bind(this);
		this.state = {
			playlist: [],
			spotifyToken: '',
			genres: [],
			cloudColors: [],
			spfyAtts: [],
			currImgURL: ''
		}
	}


	// this handles the changes in the select form
	// by updating the genres state with each selection
	handleChange(e) {
		const genresArr = this.state.genres;
		genresArr.push(e.target.value)
		this.setState({genres: genresArr}, () => {
			this.props.liftGenres(this.state.genres);
		})
	}

	handleNewUploadClick(e) {
		this.setState({
			playlist: [],
			genres: [],
			cloudColors: [],
			spfyAtts: [],
			currImgURL: ''
		});
	}

	handleSubmit(e) {
		if (e) e.preventDefault();

		const valence = this.state.spfyAtts[0];
		const mode = this.state.spfyAtts[1];
		const energy = this.state.spfyAtts[2];
		const danceability = this.state.spfyAtts[3];
		// if more than one genre is selected, join array with comma
		let genres = (this.state.genres.length > 1) ? this.state.genres.join(',') : this.state.genres[0];

		// Calling Spotify to get our playlist
		var spotifyToken = localStorage.getItem('spotifyToken');
		// Jay Magic...
		axios.defaults.headers.common['Authorization'] = "Bearer " + spotifyToken;
		  axios.get(`https://api.spotify.com/v1/recommendations?limit=25&market=US&seed_genres=${genres}&target_danceability=${danceability}&target_valence=${valence}&target_energy=${energy}&mode=${mode}`)
		  .then(response => {
				// FIXME: error handle the token here
		  this.setState({
			spotifyToken,
		  	// we have a playlist in state!
		  	playlist: response.data.tracks,
		    }, () => {
		    	this.props.liftPlaylist(this.state.playlist);
		    	this.props.history.push({
		    		pathname: '/results',
		    		state: {
		    			playlist: this.state.playlist,
		    			name: this.state.genres, // TODO: add highest attribute
		    			description: '',
		    			tags: [],
		    			genres: this.state.genres,
		    			colorData: this.state.cloudColors,
		    			spfyAtts: this.state.spfyAtts,
		    			imageURL: this.state.currImgURL,
		    			songs: this.state.playlist,
		    			spotifyToken: this.state.spotifyToken,
		    		}
		    	})
		    })
		  }).catch(error => {
				console.log(error)
				console.log('token is ' + spotifyToken + ' ... clearing token')
				localStorage.removeItem('spotifyToken')
				this.props.refreshToken();
			})
	}

	handleDrop(files) {
	  const api_key = process.env.REACT_APP_CLOUDINARY_API_KEY;
	  const upload_preset = process.env.REACT_APP_UPLOAD_PRESET;
	  let imgPublicId, imgURL;

		// mapping all the uploaded files
	  const uploaders = files.map(file => {
	    var formData = new FormData();
	    formData.append("file", file);
	    formData.append("upload_preset", upload_preset);
	    formData.append("api_key", api_key);
	    formData.append("timestamp", (Date.now() / 1000) | 0);
			// This is our upload — sending the image and our credentials to Cloudinary
	    return axios.post("https://api.cloudinary.com/v1_1/dieaqkurh/image/upload", formData, {
	      headers: { "X-Requested-With": "XMLHttpRequest" },
	    }).then(response => {
	      imgPublicId = response.data.public_id;
	      imgURL = response.data.secure_url;
	    })
	   });


	    // Axios.all will run the above API call for each image in the queue
	    axios.all(uploaders).then(() => {
	      // ... sending the image url to the back end, waiting for color data.
	      axios.post('/cloudinary-data', {imgPublicId: imgPublicId}).then((result) => {
	        // set colors in state
	        const spfyAtts = this.calculateSpfyAtts(result.data.colors);
	        this.setState({
	        	cloudColors: result.data.colors,
	        	currImgURL: imgURL,
	        	spfyAtts: spfyAtts
	        }, () => {
				this.props.liftPhoto(this.state.currImgURL);
				this.props.liftColors(this.state.cloudColors);
	        });
	      });
	    });
	  }

	getHsl(hexHash) {
		// convert hex color to hsl
		let hexColor = hexHash.split('#')[1];
		let hslColor = convert.hex.hsl(hexColor);
		let hue = hslColor[0];
		let saturation = hslColor[1];
		let lightness = hslColor[2];

		// divide colors in to 15 ranges
		let color;
		if(hue <= 24) color = 'redOrange';
		else if (hue > 24 && hue <= 48) color = 'orangeLight';
		else if (hue > 48 && hue <= 72) color = 'yellow';
		else if (hue > 72 && hue <= 96) color = 'lightGreen';
		else if (hue > 96 && hue <= 120) color = 'green';
		else if (hue > 120 && hue <= 144) color = 'greenPale';
		else if (hue > 144 && hue <= 168) color = 'greenAqua';
		else if (hue > 168 && hue <= 192) color = 'aquaBlue';
		else if (hue > 192 && hue <= 216) color = 'lightBlue';
		else if (hue > 216 && hue <= 240) color = 'blue';
		else if (hue > 240 && hue <= 264) color = 'bluePurple';
		else if (hue > 264 && hue <= 288) color = 'purplePink';
		else if (hue > 288 && hue <= 312) color = 'pink';
		else if (hue > 312 && hue <= 336) color = 'pinkRed';
		else if (hue > 336 && hue <= 360) color = 'red';

		return [color, saturation, lightness];
	}

	calculateSpfyAtts(cloudColors) {
		let hslArr = [];
		let topColors = [];
		let pctCounter = 0;
		cloudColors.map((color) => {
			let hsl = this.getHsl(color[0]);
			hslArr.push(hsl);
			if(pctCounter < 75) {
				topColors.push(hsl);
				pctCounter += color[1];
			}
		});

		let valence = 0;
		let mode = 0;
		let energy = 0;
		let danceability = 0;
		const max = 5 * cloudColors.length;

		hslArr.map((hslColor) => {
			let currColor = hues.find((color) => color.hue === hslColor[0]);
			valence += currColor.valence;
			mode += currColor.mode;
			energy += currColor.energy;
			danceability += currColor.danceability; 
		});

		valence = valence / max;
		mode = mode / max;
		energy = energy / max;
		danceability = danceability / max;

		let saturationAvg = 0; 
		let lightnessAvg = 0;
		topColors.map((color) => {
			saturationAvg += color[1]
			lightnessAvg += color[2];
		});
		saturationAvg = saturationAvg / topColors.length;		
		lightnessAvg = lightnessAvg / topColors.length;		

		if(saturationAvg < 20) {
			valence -= 0.4;
			mode -= 0.4;
			energy -= 0.3;
			danceability -= 0.5;
		} else if(saturationAvg >= 20 && saturationAvg <= 40) {
			valence -= 0.2;
			mode -= 0.2;
			energy -= 0.1;
			danceability -= 0.3
		} else if(saturationAvg >= 40 && saturationAvg <= 60) {
			danceability -= 0.1;
		} else if(saturationAvg >= 60 && saturationAvg <= 80) {
			valence += 0.1;
			mode += 0.1;
			energy += 0.1;
			danceability += 0.3;
		} else if(saturationAvg >= 80 && saturationAvg <= 100) {
			valence += 0.2;
			mode += 0.2;
			energy += 0.1;
			danceability += 0.4;
		}

		if(lightnessAvg < 20) {
			valence -= 0.4;
			mode -= 0.4;
			energy -= 0.5;
			danceability -= 0.3;
		} else if(lightnessAvg >= 20 && lightnessAvg <= 40) {
			valence -= 0.2;
			mode -= 0.2;
			energy -= 0.3;
			danceability -= 0.1;
		} else if(lightnessAvg >= 40 && lightnessAvg <= 60) {
			energy -= 0.1;
		} else if(lightnessAvg >= 60 && lightnessAvg <= 80) {
			valence += 0.2;
			mode += 0.2;
			energy += 0.3;
			danceability += 0.1;
		} else if(lightnessAvg >= 80 && lightnessAvg <= 100) {
			valence += 0.2;
			mode += 0.2;
			energy += 0.4;
			danceability += 0.1
		}
		
		mode = (mode >= (0.5) ) ? 1 : 0;
		if(valence < 0.2) valence = 0.2;
		if(valence > 1) valence = 1;
		if(energy < 0.2) energy = 0.2;
		if(energy > 1) energy = 1;
		if(danceability < 0.2) danceability = 0.2;
		if(danceability > 1) danceability = 1;
		
		return [valence, mode, energy, danceability]
	}
	
	render() {
		const {classes} = this.props;
		const phototFormStyle = {
			backgroundImage: 'url(' + sheetmusic + ')',
			backgroundSize: 'cover',
			backgroundPosition: 'center center',
			minHeight: 'calc(100vh - 125px)',
			padding: '4em 0'
		}

		let valence, mode, energy, danceability;
		if(this.state.spfyAtts.length) {
			valence = Math.floor(this.state.spfyAtts[0] * 100).toString();
			mode = (this.state.spfyAtts[1] >= 0.5) ? 'Major' : 'Minor';
			energy = Math.floor(this.state.spfyAtts[2] * 100).toString();
			danceability = Math.floor(this.state.spfyAtts[3] * 100).toString();
		}

		let photoFormContent = (!this.state.currImgURL) ? (
				<div className="show-dropzone">
					<div className="dropzone-container">
						<Dropzone className="dropzone" onDrop={this.handleDrop} accept="image/*">
					   		<p className="dropzone">Drag and drop your files or click here to upload</p>
					   		<AddAPhoto className="icon" style={{ fontSize: 100 }} />
					   </Dropzone>
					</div>
				</div>
			) : (
				<div className="show-uploaded">
					<div className="image-uploaded-top">
						<div className="currImage-container">
							<img src={this.state.currImgURL} width="300px" alt="uploaded-image" />
							<Button onClick={this.handleNewUploadClick} variant="contained" color="primary">Upload New Photo</Button>
							<div className="form-container">
								<h3>Select Genre:</h3>
								<form className="select-genre" onSubmit={this.handleSubmit} autoComplete="off">
										<select onChange={this.handleChange}>
										  <option value='blues'>blues</option>
											<option value='chill'>chill</option>
											<option value='classical'>classical</option>
											<option value='club'>club</option>
											<option value='country'>country</option>
											<option value='dance'>dance</option>
											<option value='disco'>disco</option>
											<option value='dubstep'>dubstep</option>
											<option value='electronic'>electronic</option>
											<option value='folk'>folk</option>
											<option value='funk'>funk</option>
											<option value='hip-hop'>hip-hop</option>
											<option value='house'>house</option>
											<option value='indie'>indie</option>
											<option value='indie-pop'>indie-pop</option>
											<option value='j-pop'>j-pop</option>
											<option value='jazz'>jazz</option>
											<option value='k-pop'>k-pop</option>
											<option value='metal'>metal</option>
											<option value='pop'>pop</option>
											<option value='punk'>punk</option>
											<option value='punk-rock'>punk-rock</option>
											<option value='r-n-b'>r-n-b</option>
											<option value='reggae'>reggae</option>
											<option value='rock-n-roll'>rock-n-roll</option>
											<option value='romance'>romance</option>
											<option value='salsa'>salsa</option>
											<option value='samba'>samba</option>
											<option value='synth-pop'>synth-pop</option>
											<option value='techno'>techno</option>
										</select>
									<input value="Get Playlist" type="submit"></input>
								</form>
							</div>
						</div>
						<div className="colorChart-container">
							<h3>Image Colors</h3>
							<hr className="hr" />
							<ColorChart colors={this.state.cloudColors} />
						</div>
					</div>

					<div className="image-uploaded-bottom">
						<div className="spfyAtts">
							<p className="valenceP"><em>Valence: </em>{valence}%</p>
							<p className="energyP"><em>Energy: </em>{energy}%</p>
							<p className="danceabilityP"><em>Danceability: </em>{danceability}%</p>
							<p className="modeP"><em>Mode: </em>{mode}</p>
						</div>
						<div className="attsChart-container">
							<AttsChart spfyAtts={this.state.spfyAtts} />
						</div>
					</div>
					
				</div>
			);
												   


		return (
			<div className="photoForm-container" style={phototFormStyle}>
				<div className="photoForm-paper">
					{photoFormContent}
				</div>
			</div>
		);
	}
}

export default withRouter(withStyles(styles)(PhotoForm)); 
