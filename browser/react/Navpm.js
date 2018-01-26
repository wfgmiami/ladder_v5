import React from 'react';
import { Link } from 'react-router-dom';
import Maturity from './Maturity';
import AmountSlider from './AmountSlider';
import MaturitySlider from './MaturitySlider';

class Navpm extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      collapsed: true,
	  accounts: ['aaa','bbb','ccc'],
 	  
    }
    this.toggleNavbar = this.toggleNavbar.bind(this);
	this.onAccountChange = this.onAccountChange.bind(this);
  }

  onAccountChange = (e) => {
	this.props.onAccountChange(e.target.value);
  }

  toggleNavbar(){
    this.setState({
      collapsed: !this.state.collapsed
    })
  }

  render() {

    const collapsed = this.state.collapsed;
    const classOne = collapsed ? 'collapse navbar-collapse' : 'collapse navbar-collapse show';
    const classTwo = collapsed ? 'navbar-toggle navbar-toggle-right collapsed' : 'navbar-toggle navbar-togler-right';
	const accounts = this.state.accounts;

	return (
      <div>
        <nav className="navbar navbar-default navbar-custom navbar-fixed-top">
          <div className="container-fluid">
            <div className="row">

              <div className='col-sm-1'>
                <div className="navbar-header">
                    <button  onClick={ this.toggleNavbar } className={ `${classTwo}` } type="button" data-toggle="collapse" data-target="#navbarResponsive">
                      <span className="icon-bar" />
                      <span className="icon-bar" />
                      <span className="icon-bar" />
                    </button>
					<h4 style={{ marginLeft: '7px' }}><b><span style={{ fontSize: '22' }}>SmartPM</span></b></h4> 
                </div>
              </div>

              <div className={ `${ classOne }` } id="navbarResponsive">
                <div className="col-sm-2" style={{ paddingLeft: '5%'}}>
                <p><b>Select Account</b></p>
                  <select style={{ width: '55%', display:'inline' }} className='form-control' onChange = { this.onAccountChange }>
            { accounts.map( ( account, idx ) => (
                    <option key = { idx } value = { account }>{ account }</option>
            ))}
                  </select>
                </div>
                <div className="col-sm-5">
                   <p><b>Minimum Maturity:</b></p>
				   <p><b>Maximum Maturity:</b></p>
                </div>

                <div className="col-sm-4">
                  <p><b>Invested Amount:</b></p>
                </div>
              </div>

            </div>
          </div>
        </nav>
      </div>

    );
  }
}


export default Navpm;
