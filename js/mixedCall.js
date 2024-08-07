// const { ethers, waffle } = require('hardhat');
// const { BigNumber } = require('ethers');
const { expect } = require('chai');
//const chai = require('chai');
const { constants } = require('@openzeppelin/test-helpers');

module.exports = async function(instance, trustedForwarder, from_, func_signature_, params_, revertedMessage_){
    let expectError = (typeof(revertedMessage_) === 'undefined') ? false : true;
    
    if (
        (typeof(trustedForwarder) === 'object') && 
        (typeof(trustedForwarder.address) === 'string') && 
        (trustedForwarder.address != constants.ZERO_ADDRESS)
    )  {

        const dataTx = await instance.connect(trustedForwarder)[func_signature_].populateTransaction(...params_);
        dataTx.data = dataTx.data.concat((from_.address).substring(2));

        if (expectError) {
            if (typeof revertedMessage_ === 'string') {
                return await expect(trustedForwarder.sendTransaction(dataTx)).to.be.revertedWith(revertedMessage_);
            } else {
                return await expect(trustedForwarder.sendTransaction(dataTx)).to.be.revertedWithCustomError(instance, revertedMessage_.custom);
            }
        } else {
            return await trustedForwarder.sendTransaction(dataTx);
        }
    } else {
        if (expectError) {
            if (typeof revertedMessage_ === 'string') {
                return await expect(instance.connect(from_)[func_signature_](...params_)).to.be.revertedWith(revertedMessage_);
            } else {
                return await expect(instance.connect(from_)[func_signature_](...params_)).to.be.revertedWithCustomError(instance, revertedMessage_.custom);
            }
        } else {
            return await instance.connect(from_)[func_signature_](...params_);
        }
    }
}

