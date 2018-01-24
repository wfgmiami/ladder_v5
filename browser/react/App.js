import React, { Component } from 'react';
import { connect } from 'react-redux';
import axios from 'axios';
import Nav from './Nav';
import MuniList from './MuniList';
import Maturity from './Maturity';
import Constraint from './Constraint';
import InvestedAmount from './InvestedAmount';
import BucketAllocation from './BucketAllocation';
import BucketSummary from './BucketSummary';
import PortfolioSummary from './PortfolioSummary';
import muniList from '../../muniData.json';
import BucketSummaryPlaceholder from './BucketSummaryPlaceholder';
import css from '../../assets/stylesheets/style.scss';

const Promise = require('es6-promise-promise');

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
			maxPercBond: 0.1,
			minAllocBond: 40000,
			minIncrement: 5000,
			maxAllocBond: 75000,
			maxSector: 0.30,
			maxHealthCare: 0.12,
			maxRating: 0.30,
			maxCAState: 0.2,
			maxNYState: 0.2,
			maxState: 0.2,
			munis:[],
			ytmLadder:[],
			rankedMuniList:[],
			allocatedData: [],
			allocSector: {},
			allocRating: {},
			investedAmount: 1000000,
			bucketsByRows: [],
			columns: [],
			bucketsSummary: [],
			portfolioSummary: [],
			healthCare: 0,
			aRatingAndBelow: 0,
			sector:{},
			ranking: ['HealthCare', 'nyMunis', 'caMunis', 'aRated', 'aaRated', 'couponRated'],
			cashReducer: 'Yes',
			tradePars: []
		};

		this.filterMaturity = this.filterMaturity.bind(this);
		this.setLadder = this.setLadder.bind(this);
		this.generateLadder = this.generateLadder.bind(this);
		this.createRanking = this.createRanking.bind(this);
		this.createRows = this.createRows.bind(this);
		this.createColumns = this.createColumns.bind(this);
		this.createSummary = this.createSummary.bind(this);
		this.lookForBondInDiffRanking = this.lookForBondInDiffRanking.bind(this);
		this.checkBondForLimitSize = this.checkBondForLimitSize.bind(this);
		this.allocateData = this.allocateData.bind(this);
		this.handleLimit = this.handleLimit.bind(this);
		this.allocateCash = this.allocateCash.bind(this);
		this.handleMinAllocChange = this.handleMinAllocChange.bind(this);
		this.handleCashReducerChange = this.handleCashReducerChange.bind(this);
		// this.optimize = this.optimize.bind(this);
  }

	 componentDidMount() {
		let tradePars = [];
		for( let i = this.state.minAllocBond; i <= this.state.maxAllocBond; i += this.state.minIncrement ){
			tradePars.push(i);
		}
		this.setState( { tradePars } );

		this.setState({ munis: muniList }, () => {
			this.filterMaturity( { min: 1, max: 5 } )
		});
	}

  	handleMinAllocChange( minAlloc ){
		minAlloc = minAlloc * 1;
		this.setState( { minAllocBond:  minAlloc } );
	}

	handleCashReducerChange( cashReducer ){
		this.setState( { cashReducer:  cashReducer } );
	}

	filterMaturity( filter ){
		let url = '/api/munis/filter';
		let ytmLadder = [];
		for(let i = filter.min; i <= filter.max; i++){
			ytmLadder.push(i);
		}
		this.setState({ ytmLadder });
		axios.get(url, { params: filter })
			.then( response => response.data )
			.then( munis => {
				if( this.state.ytmLadder[0] === 1 ){
					const oneYearPriceFilter = munis.filter( muni => {
						if( muni.price >= 100 && muni.price <= 105 ) return muni;
					})
					this.setState( { munis: oneYearPriceFilter } );
				}else{
					this.setState( { munis } );
				}
			})
			.then( () => this.createRanking() )
			.catch( err => console.log( err ) );
  }

  createRanking(){
		const ladderBuckets = this.state.ytmLadder;
		let rankedMunis = {};
		let nyPruned = {};
		let caPruned = {};
		let aRatedPruned = {};
		let aaRatedPruned = {};
		let couponPruned = {};
		let tempObj = {};
		let rankedMuniList = [];
		let selectedMunis = [];
		let sortedByTrade = {};
		let sortedByTradeMunis = [];

		let limitMunis = this.state.munis.filter( muni => muni.price <= 112 );
		ladderBuckets.forEach( bucket => {
			let munis = limitMunis.filter( muni => muni.ytm == bucket );
			let healthCareMunis = munis.filter( muni => muni.sector == 'Health Care' );
			healthCareMunis.forEach( hcMuni => hcMuni.rank = 'HealthCare' );
			let nyMunis = munis.filter( muni => muni.state == 'NY' );
			let caMunis = munis.filter( muni => muni.state == 'CA' );
			let aRated = munis.filter( muni => muni.rating == 'A' )
								.concat( munis.filter( muni => muni.rating == 'A+') )
								.concat( munis.filter( muni => muni.rating == 'A-' ))
								.concat( munis.filter( muni => muni.rating.slice(0,2) == 'A/' ));
			let aaRated = munis.filter( muni => muni.rating.slice(0,2) == 'AA' );
			let couponRated = munis.sort( ( a,b ) => b.coupon - a.coupon );
			rankedMunis[bucket]=[{ 'HealthCare': healthCareMunis, 'nyMunis': nyMunis, 'caMunis': caMunis, 'aRated': aRated, 'aaRated': aaRated, 'couponRated': couponRated }];

		})

		ladderBuckets.forEach( bucket => {
				rankedMunis[bucket][0]['HealthCare'].forEach( hcMuni => tempObj[hcMuni.cusip] = hcMuni );
				nyPruned[bucket] = rankedMunis[bucket][0]['nyMunis'].filter( nyMuni => !( nyMuni.cusip in tempObj ));
				caPruned[bucket] = rankedMunis[bucket][0]['caMunis'].filter( caMuni => !( caMuni.cusip in tempObj ));
				aRatedPruned[bucket] = rankedMunis[bucket][0]['aRated'].filter( aRated => !(aRated.cusip in tempObj ));
				aaRatedPruned[bucket] = rankedMunis[bucket][0]['aaRated'].filter( aaRated => !(aaRated.cusip in tempObj ));
				couponPruned[bucket] = rankedMunis[bucket][0]['couponRated'].filter( couponMuni => !(couponMuni.cusip in tempObj ));

				tempObj = {};
				rankedMunis[bucket][0]['nyMunis'].forEach( nyMuni => tempObj[nyMuni.cusip] = nyMuni );
				aRatedPruned[bucket] = aRatedPruned[bucket].filter( aRated => !( aRated.cusip in tempObj ));
				aaRatedPruned[bucket] = aaRatedPruned[bucket].filter( aaRated => !( aaRated.cusip in tempObj ));
				couponPruned[bucket] = couponPruned[bucket].filter( couponMuni => !(couponMuni.cusip in tempObj ));

				tempObj = {};
				rankedMunis[bucket][0]['caMunis'].forEach( caMuni => tempObj[caMuni.cusip] = caMuni );
				aRatedPruned[bucket] = aRatedPruned[bucket].filter( aRated => !( aRated.cusip in tempObj ));
				aaRatedPruned[bucket] = aaRatedPruned[bucket].filter( aaRated => !( aaRated.cusip in tempObj ));
				couponPruned[bucket] = couponPruned[bucket].filter( couponMuni => !(couponMuni.cusip in tempObj ));

				tempObj = {};
				rankedMunis[bucket][0]['aRated'].forEach( aRated => tempObj[aRated.cusip] = aRated );
				couponPruned[bucket] = couponPruned[bucket].filter( couponMuni => !(couponMuni.cusip in tempObj ));

				tempObj = {};
				rankedMunis[bucket][0]['aaRated'].forEach( aaRated => tempObj[aaRated.cusip] = aaRated );
				couponPruned[bucket] = couponPruned[bucket].filter( couponMuni => !(couponMuni.cusip in tempObj ));

				nyPruned[bucket].forEach( couponRatedMuni => couponRatedMuni.rank = 'nyRated');
				caPruned[bucket].forEach( couponRatedMuni => couponRatedMuni.rank = 'caRated');
				aRatedPruned[bucket].forEach( couponRatedMuni => couponRatedMuni.rank = 'aRated');
				aaRatedPruned[bucket].forEach( couponRatedMuni => couponRatedMuni.rank = 'aaRated');
				couponPruned[bucket].forEach( couponRatedMuni => couponRatedMuni.rank = 'couponRated');

				rankedMuniList[bucket] = { 'HealthCare': rankedMunis[bucket][0]['HealthCare'], 'nyMunis': nyPruned[bucket], 'caMunis': caPruned[bucket], 'aRated': aRatedPruned[bucket], 'aaRated': aaRatedPruned[bucket], 'couponRated': couponPruned[bucket] };
				tempObj = {};
		})

		ladderBuckets.forEach( bucket => {
			Object.keys( rankedMuniList[bucket] ).forEach( rank => {
				selectedMunis = rankedMuniList[bucket][rank].map( function( muni, id ) { return { id: id, dt: new Date( muni.lastTraded ).getTime(), muni: muni } } )
							.sort( ( a,b ) => b.dt - a.dt )
							.map( muni => rankedMuniList[bucket][rank][muni.id] );

				sortedByTrade[rank] = selectedMunis;
			})

			sortedByTradeMunis[bucket] = sortedByTrade;
			sortedByTrade = {};
		})


		this.setState({ rankedMuniList: sortedByTradeMunis });
  }

	setLadder( investedAmount ){

		const buckets = [...this.state.ytmLadder];
		let bucketsObj = {};
		let bucketStateKeys = [];

		for( let i = buckets[0]; i <= buckets[buckets.length - 1]; i++ ){
			bucketsObj[i] = { currentRankIndex: 0, currentBondIndex: 0, allocSector: {},allocRating: {}, allocState: {} };
		}

		bucketStateKeys = Object.keys( bucketsObj )
		.sort( function(a,b){ return b - a } )

		bucketsObj['bucketStateKeys'] = bucketStateKeys;

		this.setState({ investedAmount }, () => {
			this.generateLadder( bucketsObj );
		});


	}

	allocateData( argsObj, allocatedData, allocBucket, allocSector, allocRating, allocState, allocSectorByStates, bucketState, bucket ){

		const investedAmount = this.state.investedAmount;
		const maxHealthCare = this.state.maxHealthCare * investedAmount;
		const maxSector = this.state.maxSector * investedAmount;
		const maxNYState = this.state.maxNYState * investedAmount;
		const maxCAState = this.state.maxCAState * investedAmount;
		const maxState = this.state.maxState * investedAmount;
		const maxAandBelow = this.state.maxRating * investedAmount;
		const minIncrement = this.state.minIncrement;
		const allocatedAmount = argsObj.allocatedAmount;
		const args = [].slice.call( arguments );
		const bucketMoney = argsObj.bucketMoney;
		const ranking = argsObj.ranking; 
		const sectorStateLimit = investedAmount * 0.1;

		let currentBondIndex = argsObj.currentBucketState.currentBondIndex - 1;
		let previousBucket = 0;
		let previousAllocatedBond = '';
		let checkSector = '';
		let chosenBond = argsObj.chosenBond;
		let sector = argsObj.chosenBond.sector;
		let rating = argsObj.chosenBond.rating;
		let state = argsObj.chosenBond.state;
		let checkBucket = 0;
		let minIncrementToAllocate  = 0;
		let bucketLastIndex = 0;
		let idx = 0;
		let allocateToCash = 0;
		let sectorLimitCheck = 0;
		let nyStateLimitCheck = 0;
		let caStateLimitCheck = 0;
		let stateLimitCheck = 0;
		let aAndBelowLimitCheck = 0;
		let currBucketIdx = 0;
		let statePlaceholder = '';
		let lastBucket = '';
		let checkState = '';
		let checkRating = '';
		let checkedAll = false;
		let checkedRating = false;
		let maxStateHit = false;
		let maxSectorHit = false;
		let maxAandBelowHit = false;
		let sectorAdjustedBond = null;
		let stateAdjustedBond = null;
		let aAndBelowAdjustedBond = null;
		let adjustedBond = null;
		let cashObject = {};
		
		const availableBuckets = argsObj.buckets;
		const availableBucketsLen = argsObj.buckets.length - 1;

		if( rating === '' ) rating = 'B';

		chosenBond['investAmt'] = allocatedAmount;

		allocBucket[bucket] ? allocBucket[bucket] += allocatedAmount
		: allocBucket[bucket] = allocatedAmount;

		allocatedData[bucket] ? allocatedData[bucket].push( chosenBond )
		: allocatedData[bucket] = [chosenBond];

		if(	chosenBond.cusip !== 'Cash' ){
			allocSector[sector] ? allocSector[sector] += allocatedAmount
			: allocSector[sector] = allocatedAmount;
		}

		if( rating.slice(0,2) !== 'AA' ){
			allocRating['aAndBelow'] ? allocRating['aAndBelow'] += allocatedAmount
			: allocRating['aAndBelow'] = allocatedAmount
		}

		allocState[state] ? allocState[state] += allocatedAmount : allocState[state] = allocatedAmount
		
		if( allocSectorByStates[state] ){
			 allocSectorByStates[state][sector] ? allocSectorByStates[state][sector] += allocatedAmount :
				allocSectorByStates[state][sector] = allocatedAmount;
		}else{
			allocSectorByStates[state] = { [sector]: allocatedAmount };
		}
		
		const bucketInfo = {
			allocSector,
			allocState,
			allocBucket,
			allocRating,
			allocSectorByStates,
			allocatedData,
			minIncrement,
			maxHealthCare,
			maxSector,
			maxAandBelow,
			maxNYState,
			maxCAState,
			maxState,
			availableBuckets,
			chosenBond,
			allocatedAmount,
			bucket,
			rating,
			ranking,
			sector,
			argsObj,
			state,
			bucketState,
			aAndBelowAdjustedBond,
			sectorAdjustedBond,
			stateAdjustedBond
		}

		if( ( sector === 'Health Care' && allocSector[sector] > maxHealthCare ) || allocSector[sector] > maxSector ){
			maxSectorHit = true;
			sector === 'Health Care' ? bucketInfo.calledBy = 'HealthCare' : bucketInfo.calledBy = 'sector';

				this.handleLimit( bucketInfo );
				sectorAdjustedBond = bucketInfo.sectorAdjustedBond;
		}

		if( allocState['CA'] >= maxCAState  || allocState['NY'] >= maxNYState ){
			maxStateHit = true;
			state === 'CA' ? statePlaceholder = 'CA' : statePlaceholder = 'NY';
			bucketInfo.calledBy = statePlaceholder;
			this.handleLimit( bucketInfo );
			stateAdjustedBond = bucketInfo.stateAdjustedBond;
		}

		if( allocState[state] > maxState ){
			maxStateHit = true;
			bucketInfo.calledBy = 'state';
			this.handleLimit( bucketInfo );
			stateAdjustedBond = bucketInfo.stateAdjustedBond;
		}

		if( allocRating['aAndBelow'] >= maxAandBelow ){
			maxAandBelowHit = true;
			bucketInfo.calledBy = 'aAndBelow';
			this.handleLimit( bucketInfo );
			aAndBelowAdjustedBond = bucketInfo.aAndBelowAdjustedBond;
		}

		if( allocSectorByStates[state][sector] > sectorStateLimit ){
			bucketInfo.calledBy = "sectorState";
			this.handleLimit( bucketInfo );
		}

		if( allocBucket[bucket] >= bucketMoney ){
			debugger;

			let minAlloc = minIncrement;
			let bondIndex = 0;
			let allocatedCash = bucketMoney - allocBucket[bucket];
			let rankIndex = this.state.ranking.indexOf( ranking );
			let allocationLimit = 0;
			let leftRoom = 0;
			let minPar = this.state.minAllocBond;
			let maxPar = this.state.maxAllocBond;
			let bondNum = 0;
			let checkIncrements = 0;
			let maxIncrement = false;
			let doneAlloc = false;

				allocSector[sector] -= allocatedAmount;
				allocBucket[bucket] -= allocatedAmount;
				chosenBond['investAmt'] -= allocatedAmount;
				if( rating.slice(0,2) !== 'AA' ) allocRating['aAndBelow'] -= allocatedAmount;
				allocState[state] -= allocatedAmount;
				allocatedData[bucket].splice( allocatedData[bucket].length - 1 );

				do{
					if( argsObj.muniBondInBucket[this.state.ranking[rankIndex]].length === 0 ){
						rankIndex++;
					}
					for( let i = 0; i <  argsObj.muniBondInBucket[this.state.ranking[rankIndex]].length; i++ ){
						let testBond = Object.assign( {}, argsObj.muniBondInBucket[this.state.ranking[rankIndex]][bondIndex] );
						let testPrice = testBond.price;
						let testSector = testBond.sector;
						let testState = testBond.state;
						if( !allocSector[testSector] ) allocSector[testSector] = 0;
						if( !allocState[testState] ) allocState[testState] = 0;
						if( !allocRating['aAndBelow'] ) allocRating['aAndBelow'] = 0;

						allocationLimit = maxSector - allocSector[testSector];
						leftRoom = maxState - allocState[testState];
						if( allocationLimit > leftRoom ){
							allocationLimit = leftRoom;
						}
						if( testBond.rank === 'HealthCare' ){
								leftRoom = maxHealthCare - allocSector[testSector];
								if( allocationLimit > leftRoom ){
								allocationLimit = leftRoom;
							}
						}
						if( testBond.rank === 'nyRated' ){
							leftRoom = maxNYState - allocState['NY'];
							if( allocationLimit > leftRoom ){
								allocationLimit = leftRoom;
							}
						}
						if( testBond.rank === 'caRated' ){
							leftRoom = maxCAState - allocState['CA'];
							if( allocationLimit > leftRoom ){
								allocationLimit = leftRoom;
							}
						}
						if( testBond.rank === 'aRated' || testBond.rating.slice(0,2) !== 'AA' ){
							leftRoom = maxAandBelow - allocRating['aAndBelow'];
							if( allocationLimit > leftRoom ){
								allocationLimit = leftRoom;
							}
						}
						if( allocationLimit < 0 ) allocationLimit = 0;
						if( allocationLimit > allocatedCash ) allocationLimit = allocatedCash;

						minIncrementToAllocate = ( allocatedCash ) / ( minPar * ( testPrice * 1 / 100 ) );
						bondNum = Math.floor( minIncrementToAllocate );

						checkIncrements = 0;
						maxIncrement = false;

						if( bondNum > 0 ){

							do{
								minIncrementToAllocate = ( minPar  + ( checkIncrements ) * minIncrement )  * ( testPrice * 1 / 100 );

								if( minIncrementToAllocate > 0 && minIncrementToAllocate <= allocationLimit && ( minIncrementToAllocate <= this.state.maxPercBond * this.state.investedAmount ) && ( minIncrementToAllocate / ( testPrice / 100 ) ) <= maxPar ){
									checkIncrements++;
								}else{
									maxIncrement = true;
								}
							} while( !maxIncrement )
						}

						if( checkIncrements > 0 ) --checkIncrements;
						minIncrementToAllocate = ( minPar  + ( checkIncrements ) * minIncrement )  * ( testPrice * 1 / 100 );

						if( minIncrementToAllocate > 0 && minIncrementToAllocate <= allocationLimit && ( minIncrementToAllocate <= this.state.maxPercBond * this.state.investedAmount ) && ( minIncrementToAllocate / ( testPrice / 100 ) ) <= maxPar ){

							allocatedData[bucket].push( testBond );
							testBond['investAmt'] = minIncrementToAllocate;
							allocatedCash -= minIncrementToAllocate;
						  allocBucket[bucket] += minIncrementToAllocate;
							allocState[testState] ? allocState[testState] += minIncrementToAllocate : allocState[testState] = minIncrementToAllocate;
							if( testBond.rating.slice(0,2) !== 'AA' ) allocRating['aAndBelow'] += minIncrementToAllocate;
							allocSector[testSector] += minIncrementToAllocate;
							bondIndex++;
						}
						rankIndex++;
						bondIndex = 0;
						if( allocatedCash < minPar ){
						  doneAlloc = true;
							break;
						}
					}

				}while( rankIndex < this.state.ranking.length && !doneAlloc )

				allocatedCash = bucketMoney - allocBucket[bucket];
				cashObject['cusip'] = 'Cash';
				cashObject['investAmt'] = allocatedCash;
				allocatedData[bucket].push( cashObject );
				allocSector['Cash'] += allocatedCash;
				allocBucket[bucket] += allocatedCash;

				idx = argsObj.buckets.indexOf( bucket );
				argsObj.buckets.splice( idx, 1 );

		}
	}

	handleLimit( bucketInfo ){

		const allocSector = bucketInfo.allocSector;
		const allocBucket = bucketInfo.allocBucket;
		const allocState = bucketInfo.allocState;
		const currentBucketState = bucketInfo.argsObj.currentBucketState;
		const chosenBond = bucketInfo.chosenBond;
		const allocRating = bucketInfo.allocRating;
		const allocSectorByStates = bucketInfo.allocSectorByStates;
		const allocatedData = bucketInfo.allocatedData;
		const bucket = bucketInfo.bucket;
		const state = bucketInfo.state;
		const sector = bucketInfo.sector;
		const rating = bucketInfo.rating;
		const ranking = bucketInfo.ranking;
		const bucketState = bucketInfo.bucketState;
		const allocatedAmount = bucketInfo.allocatedAmount;
		const availableBuckets = bucketInfo.availableBuckets;
		const minIncrement = bucketInfo.minIncrement;
		const maxHealthCare = bucketInfo.maxHealthCare;
		const maxAandBelow = bucketInfo.maxAandBelow;
		const maxNYState = bucketInfo.maxNYState;
		const maxCAState = bucketInfo.maxCAState;
		const maxState = bucketInfo.maxState;
		const maxSector = bucketInfo.maxSector;
		const availableBucketsLen = bucketInfo.argsObj.buckets.length - 1;
		const calledBy = bucketInfo.calledBy;

		let sectorLimitCheck = 0;
		let nyStateLimitCheck = 0;
		let caStateLimitCheck = 0;
		let aAndBelowLimitCheck = 0;
		let stateLimitCheck = 0;

		let bucketControl = bucketInfo.argsObj.bucketControl;
		let checkedAll = false;
		let previousAllocatedBond = '';
		let minIncrementToAllocate = 0;
		let rankIndex = null;
		let checkedRating = false;
		let checkRating = '';
		let checkRatingOrState = false;
		let statePlaceholder = '';
		let allocationLimit = '';
		let checkState = '';
		let checkSector = '';
		let currentAllocation = {};
		let allocatedDataLength = allocatedData[bucket].length - 1;

		if( calledBy === 'aAndBelow' ){
			ranking === 'aRated' ? rankIndex = 3 : rankIndex = null;
			allocationLimit = maxAandBelow;
		}else if( calledBy === 'NY' || calledBy === 'CA' ){
			calledBy === 'CA' ? statePlaceholder = 'CA' : statePlaceholder = 'NY';
			allocationLimit = statePlaceholder === 'CA' ? maxCAState : maxNYState;
			ranking === 'nyMunis' ? rankIndex = 1 : rankIndex = 2;
		}else if( calledBy === 'sector' || calledBy === 'HealthCare' ){
			allocationLimit = calledBy === 'sector' ? maxSector : maxHealthCare;
			ranking === 'HealthCare' ? rankIndex = 0 : null;
		}else if( calledBy === 'state' ){
			allocationLimit = maxState;
		}

		//debugger;
		allocSector[sector] -= allocatedAmount;
		allocBucket[bucket] -= allocatedAmount;
		if( rating.slice(0,2) !== 'AA' ) allocRating['aAndBelow'] -= allocatedAmount;
		allocState[state] -= allocatedAmount;
		allocSectorByStates[state][sector] -= allocatedAmount;
		
		allocatedData[bucket].splice( allocatedDataLength, 1 );
		if ( bucketControl['nextBucket'] === null ) bucketControl['nextBucket'] = bucket;
		if( ranking === 'aRated' || ranking === 'caMunis' || ranking === 'nyMunis' || ranking === 'HealthCare' ){
			bucketState.bucketStateKeys.forEach( bucket => {
				if( bucketState[bucket].currentRankIndex === rankIndex ){
					bucketState[bucket].currentRankIndex++;
					bucketState[bucket].currentBondIndex = 0;
				}
			})
		}

	}


	lookForBondInDiffRanking( argsObj ){
		const muniData = argsObj.muniBondInBucket;
		const ranking = this.state.ranking;
		const bucketMoney = argsObj.bucketMoney;
		const bucket = argsObj.bucket;
		let currentRankIndex = argsObj.currentBucketState.currentRankIndex;
		let chosenBond = argsObj.chosenBond;
		let idx = 0;
		let currentBondIndex = 0;

		while( !chosenBond && currentRankIndex < ranking.length - 1 ){
			chosenBond = muniData[ranking[++currentRankIndex]][currentBondIndex];
		}
		if( !chosenBond ){
			return argsObj;
		}

		argsObj.chosenBond = chosenBond;
		argsObj.currentBucketState.currentRankIndex = currentRankIndex;
		argsObj.currentBucketState.currentBondIndex = currentBondIndex;

		return argsObj;

	}


	checkBondForLimitSize( argsObj ){
		let chosenBond = argsObj.chosenBond;
		let allocatedAmount = 0;
		let testRank = argsObj.currentBucketState.currentRankIndex;
		const minIncrement = this.state.minIncrement;
		const ranking = this.state.ranking;
		const sector = chosenBond.sector;
		const rating = chosenBond.rating;
		const state = chosenBond.state;
		const price = chosenBond.price;
		const maxAllocBond = this.state.maxAllocBond;
		const minAllocBond = this.state.minAllocBond;
		const maxPercBond = this.state.maxPercBond;
		const investedAmount = this.state.investedAmount;
	  const maxBondSize = maxPercBond * investedAmount;
		let bucketSize = investedAmount / this.state.ytmLadder.length;
	  	let allocSize = minAllocBond + 3 * minIncrement;

		if( Math.floor( bucketSize / allocSize ) < 2 ){
			allocSize = minAllocBond;
		}


		if( allocSize * price / 100 > maxBondSize ){
			let bondIdx = argsObj.currentBucketState.currentBondIndex;
			let testPrice = 0;

			do{
				let bucketMunis = argsObj.muniBondInBucket[ranking[testRank]];
				for( let size = maxAllocBond - minIncrement; size >= minAllocBond; size -= minIncrement ){
					do{
						testPrice = bucketMunis[bondIdx].price;
						bondIdx++;
					}while( bondIdx <  bucketMunis.length && size * testPrice / 100 > maxBondSize )
					allocSize = size;
					if( allocSize * testPrice / 100 <= maxBondSize ) break;
					bondIdx = argsObj.currentBucketState.currentBondIndex;
				}

				if( allocSize * testPrice / 100 > maxBondSize ){
					argsObj.chosenBond = null;
					argsObj = this.lookForBondInDiffRanking( argsObj );
					if( !argsObj.chosenBond ){
						return argsObj;
					}
					testRank = argsObj.currentBucketState.currentRankIndex;
					bondIdx = 0;
					allocSize = maxAllocBond;
				}else{
					argsObj.chosenBond = bucketMunis[--bondIdx];
					allocatedAmount = Number(( allocSize * testPrice / 100).toFixed(2) );
					argsObj.allocatedAmount = allocatedAmount;

					argsObj.currentBucketState.allocSector[sector] ? argsObj.currentBucketState.allocSector[sector] += allocatedAmount
					:argsObj.currentBucketState.allocSector[sector] = allocatedAmount;

					argsObj.currentBucketState.allocRating[rating] ? argsObj.currentBucketState.allocRating[rating] += allocatedAmount
					:argsObj.currentBucketState.allocRating[rating] = allocatedAmount;

					argsObj.currentBucketState.allocState[state] ? argsObj.currentBucketState.allocState[state] += allocatedAmount
					:argsObj.currentBucketState.allocState[state] = allocatedAmount;

					argsObj.currentBucketState.currentBondIndex = bondIdx + 1;

					return argsObj;
				}

			} while ( testRank < ranking.length )
			argsObj.chosenBond = null;
			return argsObj;

		}else if ( minAllocBond * price / 100 > argsObj.bucketMoney ) {
			argsObj.chosenBond = null;
			return argsObj;
		}else{

			allocatedAmount = Number(( allocSize * price / 100).toFixed(2) );
			argsObj.allocatedAmount = allocatedAmount;

			argsObj.currentBucketState.allocSector[sector] ? argsObj.currentBucketState.allocSector[sector] += allocatedAmount
			:argsObj.currentBucketState.allocSector[sector] = allocatedAmount;

			argsObj.currentBucketState.allocRating[rating] ? argsObj.currentBucketState.allocRating[rating] += allocatedAmount
			:argsObj.currentBucketState.allocRating[rating] = allocatedAmount;

			argsObj.currentBucketState.allocState[state] ? argsObj.currentBucketState.allocState[state] += allocatedAmount
			:argsObj.currentBucketState.allocState[state] = allocatedAmount;

			argsObj.currentBucketState.currentBondIndex++;

			return argsObj;
		}

	}

  generateLadder( bucketsObj ){

		let cnt = 0;
		let idx = 0;
		let currentBondIndex = 0;
		let price = 0;
		let amountToSector = 0
		let numBuckets = 1;
		let currentRankIndex = 0;
		let startIndex = 0;
		let allocateToCash = 0;
		let rating = '';
		let sector = '';
		let chosenBond = [];
		let arrBucketsToRemove = [];
		let buckets = [...this.state.ytmLadder];
		let allocSector =  {};
		let allocRating = {};
		let allocBucket = {};
		let allocState = {};
		let allocSectorByStates = {};
		let argsObj = {};
		let cashObject = {};
		let bucketControl = { nextBucket: null };
		let bucketState = Object.assign({}, bucketsObj);

		const muniData = [...this.state.rankedMuniList];
		const allocatedData = {};
		const ranking = this.state.ranking;
		const investedAmount = this.state.investedAmount;


		if( buckets.length !== 0 ) numBuckets = buckets.length;
		if( buckets.length === 0 ) {
			alert('Please select min and max maturity for the buckets!');
			return;
		}
		const bucketMoney = Number(( investedAmount / numBuckets ).toFixed(0));

		let bucketIndex = numBuckets - 1;
		let bucket = buckets[bucketIndex];
		allocSector['Cash'] = 0;
		console.log('Before the loop begins - muniData bucketState------', muniData, bucketState );

		do{
			currentRankIndex = bucketState[bucket]['currentRankIndex'];
			currentBondIndex = bucketState[bucket]['currentBondIndex'];
//			if(bucket===14 && currentBondIndex===0) debugger;
			//debugger;
			if( currentRankIndex < ranking.length ){

				chosenBond = muniData[bucket][ranking[currentRankIndex]][currentBondIndex];
				console.log("Start Of Loop - bucket, buckets, bucketIdx, bondIdx, rankIdx----", bucket, buckets, bucketIndex, currentBondIndex, currentRankIndex)
				argsObj = { muniBondInBucket: muniData[bucket], bucket, bucketMoney, currentBucketState: bucketState[bucket],  bucketState, chosenBond, bucketControl, buckets, ranking: ranking[currentRankIndex] };
			}

			if( !chosenBond && currentRankIndex < ranking.length ){
				argsObj = this.lookForBondInDiffRanking( argsObj )
				chosenBond = argsObj.chosenBond;

				if( chosenBond ){
					argsObj = this.checkBondForLimitSize( argsObj );
					console.log('chosenBond from diff ranking after look for Bond In Diff Ranking', argsObj.chosenBond)
					if( argsObj.chosenBond ){
						this.allocateData( argsObj, allocatedData, allocBucket, allocSector, allocRating, allocState, allocSectorByStates, bucketState, bucket )
					}else{
						cashObject = {};
						cashObject['cusip'] = 'Cash';
						cashObject['investAmt'] = bucketMoney;
						allocSector['Cash'] += bucketMoney;

						if( allocBucket[bucket] ){
							cashObject['investAmt'] -= allocBucket[bucket];
							allocSector['Cash'] -= allocBucket[bucket];
						}

						if( allocatedData[bucket] ) allocatedData[bucket].push( cashObject )
						else allocatedData[bucket] = [cashObject];
						idx = buckets.indexOf( bucket );
						buckets.splice( idx, 1 );
					}
				}else{
					cashObject = {};
					cashObject['cusip'] = 'Cash';
					cashObject['investAmt'] = bucketMoney;
					allocSector['Cash'] += bucketMoney;

					if( allocBucket[bucket] ){
						cashObject['investAmt'] -= allocBucket[bucket];
						allocSector['Cash'] -= allocBucket[bucket];
					}

					if( allocatedData[bucket] ) allocatedData[bucket].push( cashObject )
					else allocatedData[bucket] = [cashObject];
					idx = buckets.indexOf( bucket );
					buckets.splice( idx, 1 );
				}

			}else if( currentRankIndex < ranking.length ){
				argsObj = this.checkBondForLimitSize( argsObj );
				if( !argsObj.chosenBond ){
					cashObject = {};
					cashObject['cusip'] = 'Cash';
					cashObject['investAmt'] = bucketMoney;
					allocSector['Cash'] += bucketMoney;

					if( allocBucket[bucket] ){
						cashObject['investAmt'] -= allocBucket[bucket];
						allocSector['Cash'] -= allocBucket[bucket];
					}

					if( allocatedData[bucket] ) allocatedData[bucket].push( cashObject );
					else allocatedData[bucket] = [cashObject];
					idx = buckets.indexOf( bucket );
					buckets.splice( idx, 1 );
				}else{
					this.allocateData( argsObj, allocatedData, allocBucket, allocSector, allocRating, allocState, allocSectorByStates, bucketState, bucket );
				}

				console.log('Return from limit check bound found in Rank - bucket, argsObj, bucketState, allocBucket, allocSector, allocRating, allocatedData---', bucket, argsObj, bucketState, allocBucket, allocSector, allocRating, allocatedData)
			}else{

				cashObject = {};
				cashObject['cusip'] = 'Cash';
				cashObject['investAmt'] = bucketMoney;
				allocSector['Cash'] += bucketMoney;

				if( allocBucket[bucket] ){
					cashObject['investAmt'] -= allocBucket[bucket];
					allocSector['Cash'] -= allocBucket[bucket];
				}

				if( allocatedData[bucket] ) allocatedData[bucket].push( cashObject );
				else allocatedData[bucket] = [cashObject];
				idx = buckets.indexOf( bucket );
				buckets.splice( idx, 1 );
			}

			numBuckets = buckets.length;

			console.log('Before buckets change-numBuckets, bucket, bucketIdx, bucketControl --- ', numBuckets, bucket, bucketIndex, bucketControl)
			if( bucketControl['nextBucket'] ){
				bucketControl['nextBucket'] = null;
			}else{

				if( ( bucketIndex === 0 &&  numBuckets > 1 ) || ( numBuckets === 1 ) ){
					bucketIndex = numBuckets - 1;
					bucket = buckets[bucketIndex];
				}else if( bucketIndex === 0 && numBuckets === 1 ){
					console.log('one bucket only..............remain the same')
				}else if( numBuckets > 1 ){
					bucket = buckets[--bucketIndex]
				}

			}

		//cnt++
			//numBuckets > 0
		}while( numBuckets > 0 )


		if( this.state.cashReducer === 'Yes' )
			this.allocateCash( allocatedData, allocSector, allocRating, allocState );

		let allocSectorByState = {};
		Object.keys( allocatedData ).forEach( bucket => {
			allocatedData[bucket].forEach( bond => {
					let sector = bond.sector;
					let amt = bond.investAmt;

					if( sector ){
						if( allocSectorByState[bond.state] ){
							allocSectorByState[bond.state][sector] ? allocSectorByState[bond.state][sector] += amt :
							allocSectorByState[bond.state][sector] = amt;
						}else{
							allocSectorByState[bond.state] = { [sector]: amt }
						}
					}

			})
		})

		let summary = { allocSector, allocState, allocRating };
		console.log('FINAL.....summary, allocatedData----', summary, allocatedData, allocSectorByState);

		const bucketsSummary = this.createSummary( summary, allocSectorByState );
		const bucketsByRows = this.createRows( allocatedData );
		const columns = this.createColumns();
		console.log('SET FOR SHOW.....summary,rows,columns', bucketsSummary, bucketsByRows, columns);

		this.setState({ columns });
		this.setState({ bucketsByRows });
		this.setState({ allocatedData });
		this.setState({ allocSector });
		this.setState({ allocRating });
		this.setState({ bucketsSummary });

  }

  	allocateCash( allocatedData, allocSector, allocRating, allocState ){
		const munis = [...this.state.rankedMuniList];
		const investedAmount = this.state.investedAmount;
		const maxHealthCare = this.state.maxHealthCare * investedAmount;
		const maxSector = this.state.maxSector * investedAmount;
		const maxNYState = this.state.maxNYState * investedAmount;
		const maxCAState = this.state.maxCAState * investedAmount;
		const maxState = this.state.maxState * investedAmount;
		const maxAandBelow = this.state.maxRating * investedAmount;
		const minPar = this.state.minAllocBond;
		const maxPar = this.state.maxAllocBond;
		const minIncrement = this.state.minIncrement;
		const ranking = this.state.ranking;
		let testBond = {};
		let buckets = [...this.state.ytmLadder];
		let allocatedCash = 0;
		let bucketLength = 0;

		let price = 0;
		let rating = null;
		let sector = null;
		let state = null;
		let minIncrementToAllocate = 0;
		let allocationLimit = 0;
		let leftRoom = 0;
		let rankIndex = 0;
		let bondIndex = 0;
		let trackOverLimit = {};
		let limitType = '';
		let bondNum = 0;
		let checkIncrements = 0;
		let maxIncrement = false;
		let bucket = null;
		let allocCheck = false;

		debugger;

		buckets.forEach( bucketNumber => {
			let checkCusips = [];
			bucket = allocatedData[bucketNumber];
			bucketLength = bucket.length - 1;
			allocatedCash = bucket[bucketLength].investAmt;

			bucket.forEach( position => {
				checkCusips.push( position.cusip );
			})

			if( allocatedCash > 0){
				do{
					for( let i = 0; i <  munis[bucketNumber][ranking[rankIndex]].length; i++ ){
						testBond = Object.assign( {}, munis[bucketNumber][ranking[rankIndex]][bondIndex] );
						price = testBond.price;
						sector = testBond.sector;
						state = testBond.state;
						if( !allocSector[sector] ) allocSector[sector] = 0;
						if( !allocState[state] ) allocState[state] = 0;
						if( !allocRating['aAndBelow'] ) allocRating['aAndBelow'] = 0;

						allocationLimit = maxSector - allocSector[sector];
						leftRoom = maxState - allocState[state];
						if( allocationLimit > leftRoom ){
							allocationLimit = leftRoom;
						}
						if( testBond.rank === 'HealthCare' ){
								leftRoom = maxHealthCare - allocSector[sector];
								if( allocationLimit > leftRoom ){
								allocationLimit = leftRoom;
							}
						}
						if( testBond.rank === 'nyRated' ){
							leftRoom = maxNYState - allocState['NY'];
							if( allocationLimit > leftRoom ){
								allocationLimit = leftRoom;
							}
						}
						if( testBond.rank === 'caRated' ){
							leftRoom = maxCAState - allocState['CA'];
							if( allocationLimit > leftRoom ){
								allocationLimit = leftRoom;
							}
						}
						if( testBond.rank === 'aRated' || testBond.rating.slice(0,2) !== 'AA' ){
							leftRoom = maxAandBelow - allocRating['aAndBelow'];
							if( allocationLimit > leftRoom ){
								allocationLimit = leftRoom;
							}
						}
						if( allocationLimit < 0 ) allocationLimit = 0;
						if( allocationLimit > allocatedCash ) allocationLimit = allocatedCash;

						minIncrementToAllocate = ( allocatedCash ) / ( minPar * ( price * 1 / 100 ) );
						bondNum = Math.floor( minIncrementToAllocate );

						checkIncrements = 0;
						maxIncrement = false;

						if( bondNum > 0 ){

							do{
								minIncrementToAllocate = ( minPar  + ( checkIncrements ) * minIncrement )  * ( price * 1 / 100 );

								if( minIncrementToAllocate > 0 && minIncrementToAllocate <= allocationLimit && ( minIncrementToAllocate <= this.state.maxPercBond * this.state.investedAmount ) && ( minIncrementToAllocate / ( testBond.price / 100 ) ) <= maxPar ){
									checkIncrements++;
								}else{
									maxIncrement = true;
								}
							} while( !maxIncrement )
						}

						if( checkIncrements > 0 ) --checkIncrements;
						minIncrementToAllocate = ( minPar  + ( checkIncrements ) * minIncrement )  * ( price * 1 / 100 );

						allocCheck = checkCusips.includes( testBond.cusip );
						if( minIncrementToAllocate > 0 && minIncrementToAllocate <= allocationLimit && ( minIncrementToAllocate <= this.state.maxPercBond * this.state.investedAmount ) && ( minIncrementToAllocate / ( testBond.price / 100 ) ) <= maxPar && !allocCheck ){
							bucket[bucketLength].investAmt = allocatedCash - minIncrementToAllocate;
							testBond.investAmt = 0 + minIncrementToAllocate;


							allocState[state] ? allocState[state] += minIncrementToAllocate : allocState[state] = minIncrementToAllocate;
							if( testBond.rating.slice(0,2) !== 'AA' ) allocRating['aAndBelow'] += minIncrementToAllocate;
							allocSector[sector] += minIncrementToAllocate;
							allocSector.Cash -= allocatedCash;
							allocSector.Cash += bucket[bucketLength].investAmt;
							allocatedCash = bucket[bucketLength].investAmt;
							allocatedData[bucketNumber].splice(bucketLength, 0, testBond);
							bucketLength++;
						}
						bondIndex++;
					}
					rankIndex++;
					bondIndex = 0;

				}while( rankIndex < ranking.length )
				rankIndex = 0;
			}

			for( let i = 0; i < bucketLength; i++ ){

				price = bucket[i].price;
				sector = bucket[i].sector;
				state = bucket[i].state;
				allocationLimit = maxSector - allocSector[sector];
				limitType = sector;

				leftRoom = maxState - allocState[state];
				if( allocationLimit > leftRoom ){
					allocationLimit = leftRoom;
					limitType = state;
				}

				if( bucket[i].rank === 'HealthCare' ){
	 				leftRoom = maxHealthCare - allocSector[sector];
 					if( allocationLimit > leftRoom ){
						allocationLimit = leftRoom;
						limitType = 'HealthCare';
					}
				}

				if( bucket[i].rank === 'nyRated' ){
			   		leftRoom = maxNYState - allocState['NY'];
					if( allocationLimit > leftRoom ){
						allocationLimit = leftRoom;
						limitType = state;
					}
				}

				if( bucket[i].rank === 'caRated' ){
					leftRoom = maxCAState - allocState['CA'];
					if( allocationLimit > leftRoom ){
						allocationLimit = leftRoom;
						limitType = state;
					}
				}

				if( bucket[i].rank === 'aRated' || bucket[i].rating.slice(0,2) !== 'AA' ){
					leftRoom = maxAandBelow - allocRating['aAndBelow'];
					if( allocationLimit > leftRoom ){
						allocationLimit = leftRoom;
						limitType = 'aAndBelow';
					}
				}

				if( bucket[i].rating.slice(0,2) !== 'AA' && bucket[i].rank === 'HealthCare' ){
				
					let idx = 0;	
					let found = false;
					do{
						let bond = munis[bucketNumber]['HealthCare'][idx];
						if( bond.rating.slice(0,2) !== 'AA' ){
						
						}else{
							let par = ( bucket[i].investAmt / ( bucket[i].price / 100 ) );
							bond.investAmt = par * bond.price / 100;
							let diff = bond.investAmt - bucket[i].investAmt;
							if( allocatedCash - diff < 0 ) break;
							bucket[bucketLength].investAmt = allocatedCash - diff;
							price = bond.price;

							allocatedCash = bucket[bucketLength].investAmt;
							allocSector[sector] += diff;
							allocRating['aAndBelow'] -= bucket[i].investAmt;
							allocSector.Cash -= diff;

							if( allocRating['aAndBelow'] <= maxAandBelow && trackOverLimit['aAndBelow'] ){
								trackOverLimit['aAndBelow'] = false;
							}	
							if( bond.state === bucket[i].state ){
								allocState[bond.state] += diff;
								
								if( allocState[bond.state] <= maxState && trackOverLimit[bond.state] ){
									trackOverLimit[bond.state] = false;
								}else if( allocState[bond.state] > maxState && !trackOverLimit[bond.state] ){
									trackOverLimit[bond.state] = true;
								}	
							}else{
								allocState[bond.state] += bond.investAmt;
								allocState[bucket[i].state] -= bucket[i].investAmt; 

								if( allocState[bucket[i].state] <= maxState && trackOverLimit[bucket[i].state] ){
									trackOverLimit[bucket[i].state] = false;
								}else if( allocState[bond.state] > maxState && !trackOverLimit[bond.state] ){
									trackOverLimit[bond.state] = true;
								}
							}
							
							bucket[i] = bond;
							allocationLimit =  maxHealthCare - allocSector[sector];
 							limitType = 'HealthCare';
							found = true;;
						}
						idx++;
					}while( !found && idx < munis[bucketNumber]['HealthCare'].length )
				}

				if( allocationLimit < 0 ) allocationLimit = 0;
				minIncrementToAllocate = ( allocatedCash ) / ( minIncrement * ( price * 1 / 100 ) );

				bondNum = Math.floor( minIncrementToAllocate );
				checkIncrements = 1;
				maxIncrement = false;
				let stopIncrease = false;

				if( bondNum > 0 ){
					do{

						minIncrementToAllocate = Math.floor( checkIncrements ) * ( minIncrement * ( price * 1 / 100 ) );
						allocCheck = ( minIncrementToAllocate <= allocationLimit ||  ( !stopIncrease && !trackOverLimit[limitType] )) && ( bucket[i].investAmt + minIncrementToAllocate <= this.state.maxPercBond * this.state.investedAmount ) && ( ( bucket[i].investAmt + minIncrementToAllocate ) / ( bucket[i].price / 100 ) ) <= maxPar; 

						if( minIncrementToAllocate > 0 && allocCheck ){
							if( minIncrementToAllocate > allocationLimit ){
							   stopIncrease = true;
							}
							checkIncrements++;
						}else{
							maxIncrement = true;
						}
					} while( checkIncrements <= bondNum && !maxIncrement )
				}

				if( checkIncrements > 1 ) --checkIncrements;
				minIncrementToAllocate = checkIncrements;
				minIncrementToAllocate = Math.floor( minIncrementToAllocate ) * ( minIncrement * ( price * 1 / 100 ) );

				 allocCheck = ( bucket[i].investAmt + minIncrementToAllocate <= this.state.maxPercBond * this.state.investedAmount ) && ( ( bucket[i].investAmt + minIncrementToAllocate ) / ( bucket[i].price / 100 ) ) <= maxPar && allocatedCash >= minIncrementToAllocate;

				if( minIncrementToAllocate > 0 && minIncrementToAllocate <= allocationLimit && allocCheck || ( ( stopIncrease || checkIncrements === 1 ) && !trackOverLimit[limitType] && allocatedCash >= minIncrementToAllocate && allocCheck) ){

					if( !trackOverLimit[limitType] && minIncrementToAllocate > allocationLimit ) trackOverLimit[limitType] = true;

					bucket[bucketLength].investAmt = allocatedCash - minIncrementToAllocate;
					bucket[i].investAmt += minIncrementToAllocate;

					allocState[bucket[i].state] += minIncrementToAllocate;
					if( bucket[i].rating.slice(0,2) !== 'AA' ) allocRating['aAndBelow'] += minIncrementToAllocate;
					allocSector[sector] += minIncrementToAllocate;
					allocSector.Cash -= allocatedCash;
					allocSector.Cash += bucket[bucketLength].investAmt;
					allocatedCash = bucket[bucketLength].investAmt;

				}
			}

		})

	}

	createSummary( summary, allocSectorByState ){
		let groups = Object.keys( summary );
		let bucketsSummary = [];
		let rowObj = {};
		let arrangedPortfolioSummary = [];
		const columnFields = [ 'portfolioSummary', 'dollarAllocated', 'percentageAllocated', 'rule', 'group' ];

		groups.forEach( alloc => {
			let fields = Object.keys( summary[alloc] );
			let group = alloc;
			fields.forEach( field => {

				rowObj[columnFields[0]] = field;
				rowObj[columnFields[1]] = '$' + ( summary[alloc][field] ).toLocaleString();
				rowObj[columnFields[2]] = Number( ( ( summary[alloc][field] * 1 / this.state.investedAmount *  1 ) * 100 ).toFixed(2) ) + '%';
				rowObj[columnFields[4]] = group;

				if( field === 'Health Care' ){
					rowObj[columnFields[3]] = '<= 12%';
				}else if( field === 'aAndBelow' ){
					rowObj[columnFields[3]] = '<= 30%';
				}else if( group === 'allocSector' && field !== 'Cash' ){
					rowObj[columnFields[3]] = '<= 30%';
				}else if( group === 'allocState' ){
					rowObj[columnFields[3]] = '<= 20%';
				}else if( field === 'NY' ){
					rowObj[columnFields[3]] = '<= 20%';
				}else if( field === 'CA' ){
					rowObj[columnFields[3]] = '<= 20%';
				}
				if( rowObj[columnFields[1]] !== '$0' ){
					bucketsSummary.push( rowObj );
					rowObj = {};
				}
			})
		})

		let sectorObj = 0;
		let ratingObj = 0;
		let stateObj = 0;

		const arrLen = bucketsSummary.length - 1;
		for( let i = 0; i < arrLen + 1; i++ ){
			if( bucketsSummary[i].group === 'allocSector' ){
				sectorObj++;
			}else if( bucketsSummary[i].group === 'allocState' ){
				stateObj++;
			}else if( bucketsSummary[i].group === 'allocRating') {
				ratingObj++;
			}
		}
		let stateStart = sectorObj + ratingObj - 1;
		let stateStartRest = stateStart + 2;
		let startRating = sectorObj - 1;

		arrangedPortfolioSummary = bucketsSummary.map( ( obj, index ) => {
			let indexedObj = {};
			let startIndex = 1;
			indexedObj = Object.assign( obj, { index: index } );

			if( obj.group === 'allocSector' && obj.portfolioSummary === 'Health Care' ){
				indexedObj = { id: startIndex, obj };
			}else if( obj.group === 'allocSector' && obj.portfolioSummary !== 'Cash' ){
				indexedObj = { id: ++startIndex, obj }
			}else if( obj.group === 'allocState' && obj.portfolioSummary === 'CA' ){
				indexedObj = { id: stateStart + 1, obj };
			}else if( obj.group === 'allocState' && obj.portfolioSummary === 'NY' ){
				indexedObj = { id: stateStart, obj }
			}else if( obj.group === 'allocState' ){
				indexedObj = { id: ++stateStartRest, obj };
			}else if( obj.portfolioSummary === 'aAndBelow' ){
				obj.portfolioSummary = 'A Rated and Below';
				indexedObj = { id: startRating, obj }
			}else if( obj.portfolioSummary === 'Cash' ){
				indexedObj = { id: 0, obj }
			}

			return indexedObj;
		})

		console.log('..................arrangedPortfolioSummary', arrangedPortfolioSummary);
		arrangedPortfolioSummary.sort( function(a, b){ return a.id - b.id } );
		let result = arrangedPortfolioSummary.map( obj => bucketsSummary[obj.obj.index] );
		let obj = {};
		let arr = [];

		Object.keys( allocSectorByState ).forEach( state => {
			obj['portfolioSummary'] = state;
			arr.push(obj);
			obj = {};
			Object.keys( allocSectorByState[state] ).forEach( sector => {
				obj['portfolioSummary'] = sector;
				obj['dollarAllocated'] = allocSectorByState[state][sector].toLocaleString();
				arr.push(obj);
				obj = {};
			})

		})
		//let result = arrangedPortfolioSummary.concat(arr);
		return result.concat(arr);

	}

	createColumns(){
		let columns = [];

		for( let i = 0; i < this.state.ytmLadder.length; i++ ){
			columns.push( { key: (this.state.ytmLadder[i]).toString(),
				name: ( this.state.ytmLadder[i] ), resizable: true } )
		}

		return columns;
	}

	createRows( objBuckets ){

		const buckets = Object.keys( objBuckets );
		const numBuckets = buckets.length;
		const portfolioSize = '$' + parseInt(this.state.investedAmount).toLocaleString();

		let lenBucket = [];
		let bucketsByRows = [];
		let maxBondsInBucket = 0;
		let rowsPerBond = 4;
		let bond = {};
		let row = {};
		let totalByBucket = {};
		let totalInBucket = 0;
		let bucketIndex = buckets[0];
		let numBonds = 0;
		let cashPosition = 0;
		let avgEffDuration = 0;
		let avgModDuration = 0;
		let avgPrice = 0;
		let avgCoupon = 0;
		let avgYtw = 0;
		let tdRange = [];
		let portfolioSummary = [];
		let minTdDate = 0;
		let maxTdDate = 0;
		let tradeDateRange = '';

		buckets.forEach( bucket => {
				lenBucket.push( objBuckets[bucket].length );
				numBonds += objBuckets[bucket].length - 1;

				for( let j = 0; j < objBuckets[bucket].length; j++ ){
					totalInBucket += objBuckets[bucket][j].investAmt;
				}

				let percBucket =  Number( ( totalInBucket / this.state.investedAmount * 100 ) ).toFixed(2).toLocaleString();
				totalByBucket[bucket] = '$' + totalInBucket.toLocaleString() + ', ' + percBucket + '%';
				totalInBucket = 0;

		})

		maxBondsInBucket = Math.max(...lenBucket);
		console.log('.....totalByBucket,maxBondInBucket, rowsPerBond, bucketIndex, numBuckets, numBonds', totalByBucket,maxBondsInBucket, rowsPerBond, bucketIndex, numBuckets, objBuckets, numBonds);
		for(let i = 0; i < maxBondsInBucket; i++){
			for(let j = 0; j < rowsPerBond; j++){
				for(let k = bucketIndex; k < numBuckets + bucketIndex*1; k++){

					bond = objBuckets[k][i];

					if( bond ){
						if( j === 0 ){
							if( bond.cusip === 'Cash' ){
								row[(k).toString()] = bond.cusip + ': $' + bond.investAmt.toLocaleString();
								cashPosition += bond.investAmt;
							}else{
								row[(k).toString()] = bond.cusip + ', ' + bond.coupon + '%, ' + bond.maturity;
							}
						}else if( j === 1 && bond.cusip !== 'Cash' ){
							row[(k).toString()] = bond.state + ', ' + bond.sector + ', ' + bond.rating;

							avgEffDuration += bond.ed * bond.investAmt;
							avgModDuration += bond.md * bond.investAmt;
							avgYtw += bond.ytw * bond.investAmt;
							avgPrice += bond.price * bond.investAmt;
							avgCoupon += bond.coupon * bond.investAmt
							tdRange.push( new Date ( bond.lastTraded ).getTime() );
						}else if( j === 2 && bond.cusip !== 'Cash' ){
								row[(k).toString()] = bond.lastTraded + ', ' + bond.price;
						}else if( j === 3 && bond.cusip !== 'Cash' ){
							let par = Number( (bond.investAmt / ( bond.price / 100 ) ).toFixed(0) / 1000 ).toLocaleString() + 'k';
							let percPos = Number( ( bond.investAmt / this.state.investedAmount * 100 ) ).toFixed(2).toLocaleString();
							row[(k).toString()] = '$' + bond.investAmt.toLocaleString() + ', ' + par + ', ' + percPos + "%";
						}
					}

				}
				if( Object.keys( row ).length !== 0 ){
					bucketsByRows.push( row );
					row = {};
				}
			}
			bucketsByRows.push( {} );
		}

		minTdDate = Math.min( ...tdRange );
		maxTdDate = Math.max( ...tdRange );
		minTdDate = new Date( minTdDate ).toLocaleString().split(',')[0];
		maxTdDate = new Date( maxTdDate ).toLocaleString().split(',')[0];
		if( minTdDate === 'Invalid Date' || maxTdDate === 'Invalid Date' ){
			tradeDateRange = ''
		}else{
			tradeDateRange = minTdDate + ' - ' + maxTdDate;
		}

		avgEffDuration = Number( avgEffDuration / ( this.state.investedAmount - cashPosition ) ).toFixed(2);
		if( isNaN( avgEffDuration ) ) avgEffDuration = '';
		avgModDuration = Number( avgModDuration / ( this.state.investedAmount - cashPosition ) ).toFixed(2);
		if( isNaN( avgModDuration ) ) avgModDuration = '';
		avgYtw = Number( avgYtw / ( this.state.investedAmount - cashPosition ) ).toFixed(2);
		if( isNaN( avgYtw ) ) avgYtw = '';
		else avgYtw = avgYtw + '%';
		avgCoupon = Number( avgCoupon / ( this.state.investedAmount - cashPosition ) ).toFixed(2);
		if( isNaN( avgCoupon ) ) avgCoupon = '';
		else avgCoupon = avgCoupon + '%';
		avgPrice = Number( avgPrice / ( this.state.investedAmount - cashPosition ) ).toFixed(2);
		if( isNaN( avgPrice ) ) avgPrice = '';
		cashPosition = '$' +  Number(cashPosition.toFixed(2)).toLocaleString();

		portfolioSummary.push( { avgPrice, avgCoupon, yieldToWorst: avgYtw, modifiedDuration: avgModDuration, effectiveDuration: avgEffDuration, cash: cashPosition, numberOfBonds: numBonds, portfolioSize, tradeDateRange } );

		this.setState( { portfolioSummary } );
		bucketsByRows.push( totalByBucket );
		return bucketsByRows;
	}

   render() {
 	 console.log('.....in App.js, this.state',this.state)

    const munis = [...this.state.munis];
    return (
      <div className="container-fluid">
        <Nav handleCashReducerChange = { this.handleCashReducerChange } handleMinAllocChange = { this.handleMinAllocChange } filterMaturity = { this.filterMaturity } setLadder = { this.setLadder }/>
          <div style={{ marginTop: '135px' }} className="row">
			<PortfolioSummary portfolioSummary = { this.state.portfolioSummary } />
			{ this.state.bucketsByRows.length !== 0 ?
				<div className="col-sm-8">
					<BucketAllocation columns = { this.state.columns } bucketsByRows = { this.state.bucketsByRows }/>
					<BucketSummary bucketsSummary = { this.state.bucketsSummary } />
					<div>&nbsp;</div>
				</div>:
				<div className="col-sm-8">
			   		<BucketSummaryPlaceholder />
				</div> }

			<div className="col-sm-4">
				<Constraint />
				<MuniList munis={ munis }/>
			</div>


			<div>&nbsp;</div><div>&nbsp;</div>

		</div>
      </div>
    );
  }
}

export default App;
