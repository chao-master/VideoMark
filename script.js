var clientId = '278351935549-iq3460smts9j6tsgpk12qu0gb7dh7kq8.apps.googleusercontent.com';
var apiKey = 'AIzaSyDanE5RB6w1hyYLat98_pT2YhalJPkrZ0E';
var scopes = ['https://www.googleapis.com/auth/youtube'];

var STEPTIME = 24*60*60*1000;

function handleClientLoad() {
    gapi.client.setApiKey(apiKey);
    window.setTimeout(function(){gapi.auth.authorize({client_id: clientId, scope: scopes, immediate: true}, handleAuthResult);},1);
}

function handleAuthResult(authResult) {
    if (authResult && !authResult.error) {
        $("#overcover").removeClass("auth").removeClass("checking").removeClass("authorize");
        $("#loadBar").removeClass("loadMore").addClass("loading")
        gapi.client.load('youtube', 'v3', function(){gapi.client.youtube.subscriptions.list({'part': 'snippet',mine:true,maxResults:50,order:'unread'}).execute(addSubscriptions)})
    } else {
        $("#overcover").removeClass("checking").addClass("authorize");
        $("#authorize").click(function(){gapi.auth.authorize({client_id: clientId, scope: scopes, immediate: false}, handleAuthResult);return false;});
    }
}

var subscriptions = [];
var newCatch;
var before;
var after;
var toLoad=0;

function addSubscriptions(result){
    for (var i in result.items){
        subscriptions.push(result.items[i].snippet.resourceId.channelId)
    }
    if (result.nextPageToken){
        gapi.client.youtube.subscriptions.list({'part': 'snippet',mine:true,maxResults:50,order:'unread',pageToken:result.nextPageToken}).execute(addSubscriptions)
    } else {
        before=new Date()
        after=new Date(before.getTime() - STEPTIME)
        loadAllVideos()
    }
}

function loadAllVideos(){
    $("#loadBar").removeClass("loadMore").addClass("loading")
    toProcess = [];
    latest = $("#videos .video").eq(0).data("date")
    if (latest){
        bLatest = new Date(before.getTime() + STEPTIME*10).toISOString()
        latest = latest.toISOString()
    }
    console.log(latest)
    for (var i in subscriptions){
        if (latest){
            toProcess.push({'part': 'snippet',maxResults:10,order:'date',type:'video',publishedAfter:latest,publishedBefore:bLatest,channelId:subscriptions[i]})
        }
        toProcess.push({'part': 'snippet',maxResults:10,order:'date',type:'video',publishedAfter:after.toISOString(),publishedBefore:before.toISOString(),channelId:subscriptions[i]})
    }
    before = after
    after = new Date(after.getTime() - STEPTIME)
    $.each(toProcess,function(i,c){processChannel(c)})
}

function processChannel(critera){
    toLoad+=1;
    gapi.client.youtube.search.list(critera).execute(function(result){
        for (var i in result.items){
            var item = result.items[i]
            addVideoBox(item.id.videoId,item.snippet)//,new Date(item.snippet.publishedAt),item.snippet.title,item.snippet.channelTitle,item.snippet.thumbnails.medium.url)
        }
        toLoad -= 1;
        console.log(result,critera,result.nextPageToken,critera.PageToken)
        if(result.nextPageToken && result.nextPageToken != critera.PageToken){
            processChannel($.extend({PageToken:result.nextPageToken},critera));
        }
        if (toLoad == 0){
            $("#loadBar").addClass("loadMore").removeClass("loading")
        }
    })   
}

function addVideoBox(videoId,snippet){//,publishDate,title,channelTitle,thumbnail){
    var publishDate = new Date(snippet.publishedAt)
    var videoBox = $("<div>")
        .addClass("video")
        .data("date",publishDate)
        .data("videoId",videoId)
        .data("snippet",snippet)
        .css('background',"url('"+snippet.thumbnails.medium.url+"')")
        .click(function(){showVideo(videoBox,videoId)})
        .append(
            $("<div>")
            .append($("<header>").text(snippet.title))
            .append($("<footer>").html(snippet.channelTitle+"<br>"+snippet.publishedAt))
        )
    
    chrome.storage.sync.get("watched-"+videoId,function(item){
        if (item == "1"){
            videoBox.addClass("watched")
        }
    })
    
    var f=0;
    var t=$("#videos").children().length
    while (f!=t){
        var p = Math.floor((f+t)/2);
        if (videoId == $("#videos").children().eq(p).data("videoId")){
            return;
        } else if (publishDate > $("#videos").children().eq(p).data("date")){
            t=p;
        } else {
            f=p+1;
        }
    }
    if(t==$("#videos").children().length){
        $("#videos").append(videoBox);
    } else {
        var by = $("#videos").children().eq(t)
        if (by.data("videoId") != videoId){
            $("#videos").children().eq(t).before(videoBox);
        }
    }
}

function showVideo(videoBox,videoId){
    //var a = {}
    //a["watch-"+videoId]=1
    //chrome.storage.sync.set(a)
    videoBox.addClass("watched").appendTo("#videos")
    $("#overcover").addClass("playing")
    $("#playerFrame").attr("src","https://www.youtube-nocookie.com/embed/"+videoId+"?autoplay=1")
    var snippet = videoBox.data("snippet")
    $("#title").text(snippet.title)
    $("#description").text(snippet.description)
    $("#footer").text("Uploaded by: "+snippet.channelTitle+" at: "+snippet.publishedAt+" [http://youtu.be/"+videoId+"]")
}

$(document).ready(function(){
    $("#overcover").click(function(){$("#playerFrame").attr("src","");$("#overcover").removeClass("playing")})
    $("#loadMore").click(function(){loadAllVideos()})
})
