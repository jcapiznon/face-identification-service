'use strict'

const amqp = require('amqplib')
const fs = require('fs')

let _app = null
let _channel = null
let _conn = null

describe('Face Identification Service', function () {
  this.slow(5000)

  before('init', () => {
    process.env.OUTPUT_PIPES = 'Op1,Op2'
    process.env.LOGGERS = 'logger1,logger2'
    process.env.EXCEPTION_LOGGERS = 'exlogger1,exlogger2'
    process.env.BROKER = 'amqp://guest:guest@127.0.0.1/'
    process.env.CONFIG = '{"apiKey": "dcf18309abd54d42bd5260faf5517b2f", "faceDetectEndPoint":"https://westus.api.cognitive.microsoft.com/face/v1.0/detect",' +
      '"faceIdentifyEndPoint":"https://westus.api.cognitive.microsoft.com/face/v1.0/identify"}'
    process.env.INPUT_PIPE = 'demo.pipe.service'
    process.env.OUTPUT_SCHEME = 'RESULT'
    process.env.OUTPUT_NAMESPACE = 'RESULT'
    process.env.ACCOUNT = 'demo account'

    amqp.connect(process.env.BROKER)
      .then((conn) => {
        _conn = conn
        return conn.createChannel()
      }).then((channel) => {
      _channel = channel
    }).catch((err) => {
      console.log(err)
    })
  })

  after('terminate child process', function (done) {
    _conn.close()
    done()
  })

  describe('#start', function () {
    it('should start the app', function (done) {
      this.timeout(8000)
      _app = require('../app')
      _app.once('init', done)
    })
  })

  describe('#data', () => {
    it('should process the data and send back a result', function (done) {
      this.timeout(30000)

      fs.readFile('./test/test.jpg', function (readFileError, data) {

        let dummyData = {
          image: new Buffer(data).toString('base64'),
          personGroupId: 'group1'
        }
        _channel.sendToQueue('demo.pipe.service', new Buffer(JSON.stringify(dummyData)))

        setTimeout(done, 20000)
      })
    })
  })
})
