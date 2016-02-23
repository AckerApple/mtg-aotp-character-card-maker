"use strict";
angular.module('mtgAotpCardCreator',['mtgAotpCards','ngFileUpload','as.sortable'])
.config( [
    '$compileProvider',
    function( $compileProvider ){
      $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|data|ftp|mailto|chrome-extension):/);
    }
])
.directive('charCardEditor',function(){
  return {
    restrict:'E'
    ,scope:{model:'='}
    ,templateUrl:'char-card-editor'
    ,controller:function(){
      this.selectedColors=[]
      this.colors=[
        {label:'black',value:'b'},
        {label:'blue',value:'u'},
        {label:'green',value:'g'},
        {label:'red',value:'r'},
        {label:'white',value:'w'}
      ]
    }
    ,bindToController:true
    ,controllerAs:'editor'
  }
})
.directive('mtgAotpCardCreator',function(){
  return {
    restrict:'E'
    ,scope:{}
    ,bindToController:true
    ,controllerAs:'cardCreator'
    ,templateUrl:'mtg-aotp-card-creator'
    ,controller:function(AotpCards, AotpDemoCharCard){
      this.seriesIndex=0
      this.selectedIndex = 0

      this.priorSeries = function(){
        this.seriesIndex=this.seriesIndex==0?Object.keys(this.cards.character).length-1:this.seriesIndex-1
        this.selectedSeries = this.cards.character[ Object.keys(this.cards.character)[this.seriesIndex] ]
        this.selectFirstCard()
      }

      this.nextSeries = function(){
        this.seriesIndex=this.seriesIndex==Object.keys(this.cards.character).length-1?0:this.seriesIndex+1
        this.selectedSeries = this.cards.character[ Object.keys(this.cards.character)[this.seriesIndex] ]
        this.selectFirstCard()
      }

      this.deleteSeries = function(){
        delete this.selectedSeries[this.selectedSeries.name]
        var sLen = Object.keys(this.selectedSeries).length
        this.seriesIndex = this.seriesIndex >= sLen ? sLen-1 : this.seriesIndex
        this.selectedSeries = this.selectedSeries[ Object.keys(this.selectedSeries)[this.seriesIndex] ]
      }


      this.priorCard = function(){
        this.selectedIndex=this.selectedIndex==0?Object.keys(this.selectedSeries.data).length-1:this.selectedIndex-1
        this.selectedCard = this.selectedSeries.data[ Object.keys(this.selectedSeries.data)[this.selectedIndex] ]
      }

      this.nextCard = function(){
        this.selectedIndex=this.selectedIndex==Object.keys(this.selectedSeries.data).length-1?0:this.selectedIndex+1
        this.selectedCard = this.selectedSeries.data[ Object.keys(this.selectedSeries.data)[this.selectedIndex] ]
      }

      this.deleteCard = function(){
        delete this.selectedSeries.data[this.selectedCard.name]
        var sLen = Object.keys(this.selectedSeries.data).length
        this.selectedIndex = this.selectedIndex >= sLen ? sLen-1 : this.selectedIndex
        this.selectedCard = this.selectedSeries.data[ Object.keys(this.selectedSeries.data)[this.selectedIndex] ]
      }

      this.setFetchResult = function(res){
        this.cards = res.data
        this.selectFirstCard()
      }

      this.selectFirstCard = function(){
        this.selectedSeries = this.selectedSeries || this.cards.character[ Object.keys(this.cards.character)[0] ]
        this.selectedCard = this.selectedSeries.data[ Object.keys(this.selectedSeries.data)[0] ]
      }

      this.selectDemoCard = function(){
        AotpDemoCharCard.get()
        .then( this.setDemoCardResult.bind(this))
      }

      this.setDemoCardResult = function(res){
        this.selectedCard = res.data
      }

      AotpCards.list()
      .then(this.setFetchResult.bind(this))
    }
  }
})
.directive('charCard',function(){
  return {
    restrict:'E'
    ,scope:{model:'=', size:'='}
    ,templateUrl:'char-card'
    ,controller:function(Upload){
      this.uploadAvatarTo = function($file,model){
        Upload.base64DataUrl($file)
        .then(function(res){
          model.avatar = {dataUrl:res}
        })
      }

      this.uploadFigureTo = function($file,model){
        Upload.base64DataUrl($file)
        .then(function(res){
          model.figure = {dataUrl:res}
        })
      }
    }
    ,bindToController:true
    ,controllerAs:'charCard'
  }
})
.directive('printCanvas',function($q,$parse){
	return {
		restrict:'EA',
		transclude:true,
    scope:false,
		//template:'<ng-transclude style="display:inline-block;" ng-style="{width:printer.printWidth+\'px\',height:printer.printHeight+\'px\'}"></ng-transclude></div>',
		bindToController:{
      printTrigger:'=', printModel:'=',
      printWidth:'=', printHeight:'=',
      beforePrint:'&', afterPrint:'&'
    },
		controllerAs:'printer',
		controller:function(){
			this.printCanvas = function(canvas){
			  this.printModel = {
			  	canvas:canvas,
			  	url:canvas.toDataURL("image/png",1)
			  }
			}

			this.printElm = function(elm){
				var defer = $q.defer()
				var options = {
			  	allowTaint:true
			    ,useCORS:true
			    ,letterRendering:true
			    ,onrendered:defer.resolve.bind(defer)//this.printCanvas.bind(this)
			    ,width:this.printWidth
			    ,height:this.printHeight
			  }
				html2canvas(elm,options)

				return defer.promise.then( this.printCanvas.bind(this) )
			}
		},
		link:function($scope, jElm, attrs, a, transclude){
      var print = function(){
        $scope.printer.printElm(jElm[0])
        .then(function(){
          $scope[attrs.printModel] = $scope.printer.printModel
          $parse(attrs.afterPrint)($scope)
        })
      }
			$scope.$watch(attrs.printTrigger, function(value){
				if(value){
          $scope.printer.printWidth = $parse(attrs.printWidth)($scope)
          $scope.printer.printHeight = $parse(attrs.printHeight)($scope)

          $parse(attrs.beforePrint)($scope)
          setTimeout(print, 100)
				}
			})

			transclude($scope, function(clone){
				jElm.html('')
				jElm.append(clone)
			})
		}
	}
})
.filter('symbolize',function($sce){
  return function(string){
    string = string.replace(/\#\{([^\}]*)\}/g, '<span class="symbolized $1"></span>')
    return string;
  }
})
.filter('trustAsHtml', function($sce){
  return function(text) {
      return $sce.trustAsHtml(text);
  };
})
.filter('keys',function(){
  return function(val){
    return Object.keys(val)
  }
})
.filter('jsonExportUrl',function(){
  return function(ob){
    try{
      return "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(ob))
    }catch(e){
      return "data:text/json;charset=utf-8,invalid JSON"
    }
  }
})
.filter('copy',function(){
  return function(val){
    return angular.copy(val)
  }
})