Date.prototype.getUnixTime = function() { return this.getTime()/1000|0 };
if(!Date.now) Date.now = function() { return new Date(); }
Date.time = function() { return Date.now().getUnixTime(); }


function handleObjectItemDragStart(event) {
  var el = event.target;
  
  event.dataTransfer.effectAllowed = 'move';
  var objectItem = {
    content: el.getAttribute('content'),
    type: 'range',
    unscheduled_id: Number(el.getAttribute('item-id'))
  };
  event.dataTransfer.setData("text", JSON.stringify(objectItem));
}

function addUnscheduledItem(id, title) {
  $('.items-panel .items').append('<li draggable="true" class="item" item-id="'+id+'" content="'+title+'">'+title+'<span class="x-btn">x</span></li>');
  $('.items-panel .items .item[item-id='+id+']')[0].addEventListener('dragstart', handleObjectItemDragStart.bind(this), false);
}

// DOM element where the Timeline will be attached
var container = document.getElementById('visualization');
var groups;
var items;
$.ajax({
  url: '/employees',
  success: function(data){
    groups = new vis.DataSet(data);
  },
  async: false
});

// Create a DataSet (allows two way data-binding)
$.ajax({
  url: '/tasks',
  success: function(data){
    for (i=0;i<data.length;i++) {
      data[i].start = new Date(data[i].start);
      data[i].end = new Date(data[i].end);
    }
    items = new vis.DataSet(data);
  },
  async: false
});

$.ajax({
  url: '/unscheduled_tasks',
  success: function(data){
    for (i=0;i<data.length;i++) {
      addUnscheduledItem(data[i].id, data[i].title);
    }
  },
  async: false
});


function updateItem(item, callback) {
    $.ajax({
    url: '/tasks',
    method: 'PUT',
    data: {'id':item.id, 'title': item.content, 'group': item.group, 'start': item.start.getUnixTime(), 'end': item.end.getUnixTime()},
    success: function(data){
      callback(item);
    },
    async: false
    });
  }

// Configuration for the Timeline
var options = {
  onMove: function (item, callback) {
    if (timeline.getSelection().length == 1) {
      var overlapping = items.get({
        filter: function(testItem) {
          if (testItem.id == item.id || testItem.group != item.group) {
            return false;
          }
          if ((item.start.getTime() < testItem.end.getTime()) && (item.end.getTime() > testItem.start.getTime())) {
            return true;
          }
          return false;
        }
      });
      if (overlapping.length == 0) {
        updateItem(item, callback);
        // callback(item);
      }
      else if (item.start.getTime() >= overlapping[0].start.getTime()) {
        callback(null);
      }
      else {
        var diff = item.end.getUnixTime() - overlapping[0].start.getUnixTime();

        items.get({filter: function(i){
          if (i.group == item.group && item.start.getTime() < i.start.getTime()) {
            i.start = new Date((i.start.getUnixTime() + diff) * 1000);
            i.end = new Date((i.end.getUnixTime() + diff) * 1000);
            timeline.itemsData.update(i);
            updateItem(i, function(){});
            return true;
          }
        }});
        updateItem(item, callback);
        // callback(item);
      }
    }
  },
  start: new Date((new Date().getUnixTime() - 1814400) * 1000),
  end: new Date((new Date().getUnixTime() + 2419200) * 1000),
  type: 'range',
  stack: false,
  selectable: true,
  multiselect: true,
  multiselectPerGroup: true,
  editable: true,
  orientation: 'top',
  timeAxis: {scale: 'week', step: 1},
  locale: 'en_EN',
  onInitialDrawComplete: function(){ $('.items-panel').show();},
  onAdd: function(item, callback) {
    if (item.unscheduled_id == undefined) { // New
      item.content = prompt('Edit items text:', item.content);
      if (item.content == null) {
        callback(null); // cancel updating the item
        return
      }
    }
    $.ajax({
    url: '/tasks',
    method: 'POST',
    data: {'title': item.content, 'group': item.group, 'start': item.start.getUnixTime(), 'end': item.end.getUnixTime(), 'unscheduled_id': item.unscheduled_id},
    success: function(data){
      item.id = data['id'];
      if (item.unscheduled_id) {
        $('li.item[item-id='+item.unscheduled_id+']').remove();
        item.unscheduled_id == undefined;
      }
      callback(item);
    },
    async: false
    });
  },
  onRemove: function(item, callback) {
    $.ajax({
    url: '/tasks',
    method: 'DELETE',
    data: {'id': item.id},
    success: function(data){
      // item.id = data['id'];
      callback(item);
      addUnscheduledItem(data['id'], item.content)
    },
    async: false
    });
  },
  onUpdate: function(item, callback) { updateItem(item, callback); }
};

// Create a Timeline
var timeline = new vis.Timeline(container, items, groups, options);


var shiftPressed = false;
var endPressed = false;
$(window).keydown(function(evt) {
  if (evt.which == 16) { // shift
    shiftPressed = true;
  }
}).keyup(function(evt) {
  if (evt.which == 16) { // shift
    shiftPressed = false;
  }
});
$(window).keydown(function(evt) {
  if (evt.which == 35) { // end
    endPressed = true;
    if (shiftPressed){
      var selection = timeline.getSelection();
      if (selection.length == 1) {
        var item = items.get(selection[0]);
        timeline.setSelection(items.getIds({filter: function(i){
          if (i.id == item.id) { return true}
            else if (i.group == item.group && item.start.getTime() < i.start.getTime()) {return true; }
        }}));
      }
    }
  }
}).keyup(function(evt) {
  if (evt.which == 35) { // end
    endPressed = false;
  }
});

$('.side .items').on('click', '.item .x-btn', function(){
  item_id = $(this).parent().attr('item-id');
  $.ajax({
    url: '/unscheduled_tasks',
    method: 'DELETE',
    data: {'id': item_id},
    success: function(data){
      $('li.item[item-id='+item_id+']').remove();
    },
    async: false
    });
});
