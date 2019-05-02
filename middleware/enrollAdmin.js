'use strict';
/*
* Copyright IBM Corp All Rights Reserved
*
* SPDX-License-Identifier: Apache-2.0
*/
/*
 * Enroll the admin user
 */

var Fabric_Client = require('fabric-client');
var Fabric_CA_Client = require('fabric-ca-client');
var CouchDB_KVS = require('fabric-client/lib/impl/CouchDBKeyValueStore');

var path = require('path');
var util = require('util');
var os = require('os');

//
var fabric_client = new Fabric_Client();
var fabric_ca_client = null;
var member_user = null;
var couch_url = "http://localhost:5984";

// create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
function login(username,password) {
    return new CouchDB_KVS({ url: couch_url
    }).then((state_store) => {
        // assign the store to the fabric client
        fabric_client.setStateStore(state_store);
        var crypto_suite = Fabric_Client.newCryptoSuite();
        // use the same location for the state store (where the users' certificate are kept)
        // and the crypto store (where the users' keys are kept)
        var crypto_store = Fabric_Client.newCryptoKeyStore(CouchDB_KVS,{url:couch_url});
        crypto_suite.setCryptoKeyStore(crypto_store);
        fabric_client.setCryptoSuite(crypto_suite);
        var	tlsOptions = {
            trustedRoots: [],
            verify: false
        };
        // be sure to change the http to https when the CA is running TLS enabled
        fabric_ca_client = new Fabric_CA_Client('http://localhost:7054', tlsOptions , 'ca.moha.nid.com', crypto_suite);

        // first check to see if the admin is already enrolled
        // need to enroll it with CA server
        return fabric_ca_client.enroll({
            enrollmentID: username,
            enrollmentSecret: password
            }).then((enrollment) => {
            console.log(util.format('Successfully enrolled %s user ',username));
            return fabric_client.createUser(
                {username: username,
                    mspid: 'mohaMSP',
                    cryptoContent: { privateKeyPEM: enrollment.key.toBytes(), signedCertPEM: enrollment.certificate }
                });
            }).then((user) => {
            member_user = user;
            return fabric_client.setUserContext(member_user);
            }).catch((err) => {
            console.error('Failed to enroll and persist user. Error: ' + err.stack ? err.stack : err);
            throw new Error('Failed to enroll user');
            });
    }).then(() => {
        console.log('Assigned the user to the fabric client ::' + member_user.toString());
    }).catch((err) => {
        throw new Error(err);
    });
}

module.exports.login = login;

