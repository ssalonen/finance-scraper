/* jslint node: true */

'use strict'

exports.handler = async function (event, context) {
  try {
    console.log('Event: ', JSON.stringify(event, null, '\t'))
    console.log('Context: ', JSON.stringify(context, null, '\t'))
    return 'Success from API'
  } catch (err) {
    console.error(err)
    return err
  }
}
