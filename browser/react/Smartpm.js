import React, { Component } from 'react';
import { connect } from 'react-redux';
import axios from 'axios';
import Navpm from './Navpm';
import MuniList from './MuniList';
import Maturity from './Maturity';
import Constraint from './Constraint';
import InvestedAmount from './InvestedAmount';
import BucketAllocation from './BucketAllocation';
import BucketSummary from './BucketSummary';
import PortfolioSummary from './PortfolioSummary';
import smaList from '../../sma.json';
import BucketSummaryPlaceholder from './BucketSummaryPlaceholder';
import css from '../../assets/stylesheets/style.scss';

const Promise = require('es6-promise-promise');

class Smartpm extends Component {
  constructor(props) {
    super(props);

    this.state = {
			munis: [],
			smas:{},
			bucketColumns:{},
			allocatedData: [],
			allocSector: {},
			allocRating: {},
			investedAmount: {},
			bucketsByRows: [],
			columns: [],
			bucketsSummary: [],
			portfolioSummary: [],
			minMaturity: {},
			maxMaturity: {},
			accounts: [],
			amt: 0,
			min: 0,
			max: 0
	};

	this.createRows = this.createRows.bind(this);
	this.createColumns = this.createColumns.bind(this);
	this.createSummary = this.createSummary.bind(this);
 	this.createObject = this.createObject.bind(this);
	this.handleAccountChange = this.handleAccountChange.bind(this);
  }

  componentDidMount() {
	this.setState({ munis: smaList }, () => {
		this.createObject();
	});
  }

  handleAccountChange( reqAccount ){

		const sma = this.state.smas;
		const bucketColumns = this.state.bucketColumns;
		const investedAmount = this.state.investedAmount;

		if( bucketColumns[reqAccount] ){
			const bucketsInAccount = bucketColumns[reqAccount].sort( function(a,b) { return a - b } );
			let accountCash = sma[reqAccount]['allocSector'].Cash;

			let summary = { allocSector: sma[reqAccount]['allocSector'], allocState: sma[reqAccount]['allocState'], allocRating: sma[reqAccount]['allocRating'] };

			const bucketsSummary = this.createSummary( summary, sma[reqAccount]['allocSectorByStates'], investedAmount[reqAccount] );
			const bucketsByRows = this.createRows( sma[reqAccount]['allocatedData'], investedAmount[reqAccount], accountCash );
			const columns = this.createColumns( bucketsInAccount );

			this.setState( { min: this.state.minMaturity[reqAccount] } );
			this.setState( { max: this.state.maxMaturity[reqAccount] } );
			this.setState( { amt: this.state.investedAmount[reqAccount] } );
			this.setState( { columns } );
			this.setState( { bucketsByRows } );
			this.setState( { bucketsSummary } );
		}

  }

  createObject( ){
		let munis = this.state.munis;
		let sma = {};
		let bond = {};
		let objRating = null;
		let investedAmount = {};
		let minMaturity = {};
		let maxMaturity = {};
		let bucketColumns = {};
		let accounts = [];

		debugger;

		munis.forEach( obj => {
			if( !sma[obj.account] ){
					sma[obj.account] = { allocSector: {}, allocState: {} , allocRating: {}, allocSectorByStates: {}, allocatedData: {} };
				investedAmount[obj.account] = obj.size;
				minMaturity[obj.account] = obj.minMaturity;
				maxMaturity[obj.account] = obj.maxMaturity;
				accounts.push(obj.account);
			}

			if( obj.cusip === "CASHUSD" ){
				sma[obj.account]['allocSector'].Cash = obj.par;
			}else{
				if( obj.rating === '' ) objRating = 'B';
				else objRating = obj.rating;
				let state = obj.state;
				let sector = obj.sector;

				let investAmt = Number( ( obj.par * obj.price / 100 ) ).toFixed(2);
				investAmt = investAmt * 1;
				bond = { coupon: obj.coupon, cusip: obj.cusip, ed: obj.ed, investAmt: investAmt, lastTraded: obj.lastTraded,
							maturity: obj.maturity, md: obj.md, price: obj.price, rating: objRating, sector: obj.sector, state: obj.state, ytm: obj.ytm, ytw: obj.ytw };

				if( sma[obj.account]['allocatedData'][obj.ytm] ){
					sma[obj.account]['allocatedData'][obj.ytm].push( bond );
					if( bucketColumns[obj.account].indexOf( obj.ytm * 1 ) === -1 ) bucketColumns[obj.account].push( obj.ytm * 1 );
				}else{
					bucketColumns[obj.account] ? bucketColumns[obj.account].push( obj.ytm * 1 ) : bucketColumns[obj.account] = [obj.ytm * 1];
					sma[obj.account]['allocatedData'][obj.ytm] = [bond];
				}

				if( sma[obj.account]['allocState'][state] ){
					sma[obj.account]['allocState'][state] += investAmt;
					}else{
						sma[obj.account]['allocState'][state] = investAmt;
					}

					if( sma[obj.account]['allocSector'][sector] ){
						sma[obj.account]['allocSector'][sector] += investAmt;
					}else{
						sma[obj.account]['allocSector'][sector] = investAmt;
					}

					if( obj.rating.slice(0,2) !== 'AA' ){
						sma[obj.account]['allocRating']['aAndBelow'] ? sma[obj.account]['allocRating']['aAndBelow'] += investAmt : sma[obj.account]['allocRating']['aAndBelow'] = investAmt;
					}

					if( sma[obj.account]['allocSectorByStates'][state] ){
						sma[obj.account]['allocSectorByStates'][state][sector] ? sma[obj.account]['allocSectorByStates'][state][sector] += investAmt : sma[obj.account]['allocSectorByStates'][state][sector] = investAmt;
					}else{
							sma[obj.account]['allocSectorByStates'][state] = {};
							sma[obj.account]['allocSectorByStates'][state][sector] = investAmt;
					}

				}

				this.setState( { bucketColumns } );
				this.setState( { smas: sma } )
				this.setState( { investedAmount } );
				this.setState( { minMaturity } );
				this.setState( { maxMaturity } );
				this.setState( { accounts } );
			})
  	}


	createSummary( summary, allocSectorByState, investedAmount ){
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
				rowObj[columnFields[2]] = Number( ( ( summary[alloc][field] * 1 / investedAmount *  1 ) * 100 ).toFixed(2) ) + '%';
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

		return result.concat(arr);

	}

	createColumns( bucketColumns ){
		let columns = [];

		for( let i = 0; i < bucketColumns.length; i++ ){
			columns.push( { key: (bucketColumns[i]).toString(),
				name: ( bucketColumns[i] ), resizable: true } )
		}

		return columns;
	}

	createRows( objBuckets, investedAmount, accountCash ){

		const buckets = Object.keys( objBuckets );
		const numBuckets = buckets.length;
		const portfolioSize = '$' + parseInt(investedAmount).toLocaleString();

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
				numBonds += objBuckets[bucket].length;

				for( let j = 0; j < objBuckets[bucket].length; j++ ){
					totalInBucket += objBuckets[bucket][j].investAmt;
				}

				let percBucket =  Number( ( totalInBucket / parseInt( investedAmount ) * 100 ) ).toFixed(2).toLocaleString();
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
							row[(k).toString()] = bond.cusip + ', ' + bond.coupon + '%, ' + bond.maturity;
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
							let percPos = Number( ( bond.investAmt / investedAmount * 100 ) ).toFixed(2).toLocaleString();
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

		avgEffDuration = Number( avgEffDuration / ( investedAmount - accountCash ) ).toFixed(2);
		if( isNaN( avgEffDuration ) ) avgEffDuration = '';
		avgModDuration = Number( avgModDuration / ( investedAmount - accountCash ) ).toFixed(2);
		if( isNaN( avgModDuration ) ) avgModDuration = '';
		avgYtw = Number( avgYtw / ( investedAmount - accountCash ) ).toFixed(2);
		if( isNaN( avgYtw ) ) avgYtw = '';
		else avgYtw = avgYtw + '%';
		avgCoupon = Number( avgCoupon / ( investedAmount - accountCash ) ).toFixed(2);
		if( isNaN( avgCoupon ) ) avgCoupon = '';
		else avgCoupon = avgCoupon + '%';
		avgPrice = Number( avgPrice / ( investedAmount - accountCash ) ).toFixed(2);
		if( isNaN( avgPrice ) ) avgPrice = '';
		accountCash = '$' +  Number(accountCash.toFixed(2)).toLocaleString() + " | " + Number(accountCash/investedAmount*100).toFixed(2) + '%';

		portfolioSummary.push( { avgPrice, avgCoupon, yieldToWorst: avgYtw, modifiedDuration: avgModDuration, effectiveDuration: avgEffDuration, cash: accountCash, numberOfBonds: numBonds, portfolioSize, tradeDateRange } );

		this.setState( { portfolioSummary } );
		bucketsByRows.push( totalByBucket );
		return bucketsByRows;
	}

   render() {
 	 console.log('.....in App.js, this.state',this.state)

    return (
      <div className="container-fluid">
       <Navpm accounts = { this.state.accounts } minMaturity = { this.state.min } maxMaturity = { this.state.max } investedAmount = { this.state.amt.toLocaleString() } handleAccountChange = { this.handleAccountChange } />

          <div style={{ marginTop: '70px' }} className="row">
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
			</div>


			<div>&nbsp;</div><div>&nbsp;</div>

		</div>
      </div>
    );
  }
}

export default Smartpm;
