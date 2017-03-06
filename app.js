'use strict'

const reekoh = require('reekoh')
const _plugin = new reekoh.plugins.Service()

const isEmpty = require('lodash.isempty')
const isPlainObject = require('lodash.isplainobject')
const request = require('request')
const get = require('lodash.get')

_plugin.on('data', (data) => {
  if (!isPlainObject(data)) {
    _plugin.log(JSON.stringify({
      title: 'Face Identificaiton Service',
      message: 'Invalid data received'
    }))
    return _plugin.logException(new Error(`Invalid data received. Must be a valid JSON Object. Data: ${data}`))
  }

  if (isEmpty(data) || isEmpty(data.image)) {
    _plugin.log(JSON.stringify({
      title: 'Face Identificaiton Service',
      message: 'No image'
    }))
    return _plugin.logException(new Error('Invalid data received. Data must have a base64 encoded image field.'))
  }

  if (isEmpty(data.personGroupId)) {
    _plugin.log(JSON.stringify({
      title: 'Face Identificaiton Service',
      message: 'No person group ID'
    }))
    return _plugin.logException(new Error('Invalid data received. Data must have personGroupId field.'))
  }
  request.post({
    url: _plugin.config.faceDetectEndPoint,
    qs: {
      returnFaceId: true,
      returnFaceLandmarks: false,
      returnFaceAttributes: 'age,gender,headPose,smile,facialHair,glasses'
    },
    headers: {
      'Content-Type': 'application/octet-stream',
      'Ocp-Apim-Subscription-Key': _plugin.config.apiKey
    },
    body: new Buffer(data.image, 'base64')
  }, (error, response, body) => {
    if (error || !isEmpty(get(body, 'error'))) {
      let err = error || get(body, 'error')
      _plugin.log(JSON.stringify({
        title: 'Face Identificaiton Service',
        message: err
      }))
      return _plugin.logException(err)
    } else {
      let faceDetectResult = JSON.parse(body)
      let faceId = get(faceDetectResult, '[0].faceId')

      request.post({
        url: _plugin.config.faceIdentifyEndPoint,
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': _plugin.config.apiKey
        },
        json: {
          personGroupId: data.personGroupId,
          faceIds: [faceId],
          maxNumOfCandidatesReturned: 1,
          confidenceThreshold: 0.5
        }
      }, (error, response, body) => {
        if (error || !isEmpty(get(body, 'error'))) {
          let err = error || get(body, 'error')
          _plugin.log(JSON.stringify({
            title: 'Face Identificaiton Service',
            message: err
          }))
          return _plugin.logException(err)
        }
        if (isEmpty(body)) {
          _plugin.log(JSON.stringify({
            title: 'Face Identificaiton Service',
            message: 'Empty response'
          }))
          return _plugin.logException(new Error('No Result'))
        }
        _plugin.pipe(data, JSON.stringify({matchFound: body}))
          .then(() => {
            _plugin.log(JSON.stringify({
              title: 'Face Identification Service',
              data: data,
              result: body
            }))
          })
          .catch((error) => {
            _plugin.logException(error)
          })
      })
    }
  })
})

_plugin.once('ready', () => {
  _plugin.log('Face Identification Service has been initialized.')
  _plugin.emit('init')
})

module.exports = _plugin
