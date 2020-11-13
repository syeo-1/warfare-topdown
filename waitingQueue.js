var waitingQueue = [];
var rear = 0;
var front = 0;
var size = 0

module.exports = {
    getQueue: function getQueue(){
        return waitingQueue
    },
    getSize: function getSize() {
        return size
    },
    enQueue: function insert(user_id){
        waitingQueue.push(user_id)
        size++;
    },
    deQueue: function remove() {
        var user_id = waitingQueue.shift()
        return user_id
        
    }
}