const https = require('https');

// Paystack API helper
const paystackRequest = (path, data, method = 'POST') => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path,
      method,
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve(parsedData);
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
};

// Create transfer recipient
exports.createTransferRecipient = async (accountDetails) => {
  try {
    const response = await paystackRequest('/transferrecipient', {
      type: 'nuban',
      name: accountDetails.accountName,
      account_number: accountDetails.accountNumber,
      bank_code: accountDetails.bankCode,
      currency: 'NGN'
    });
    
    return response;
  } catch (error) {
    console.error('Create recipient error:', error);
    throw error;
  }
};

// Initiate transfer
exports.initiatePaystackTransfer = async ({ amount, recipient, reference }) => {
  try {
    const response = await paystackRequest('/transfer', {
      source: 'balance',
      amount,
      recipient: recipient.recipientCode || recipient,
      reason: 'TBG Withdrawal',
      reference
    });
    
    return {
      success: response.status,
      data: response.data,
      message: response.message
    };
  } catch (error) {
    console.error('Transfer error:', error);
    throw error;
  }
};

// Verify transfer
exports.verifyTransfer = async (reference) => {
  try {
    const response = await paystackRequest(`/transfer/verify/${reference}`, null, 'GET');
    return response;
  } catch (error) {
    console.error('Verify transfer error:', error);
    throw error;
  }
};

// Get supported banks
exports.getBanks = async () => {
  try {
    const response = await paystackRequest('/bank', null, 'GET');
    return response;
  } catch (error) {
    console.error('Get banks error:', error);
    throw error;
  }
};