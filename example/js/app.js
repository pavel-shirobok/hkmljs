angular.module('HkmlJsTest', []).
    directive('hkmlJsTester', function(){
        return {
            replace : true, transclude : true,
            templateUrl : 'js/hkmlJsTester.html',
            scope : { "hotKey" : '@' },

            controller : function($scope, $element){
                $scope.count = 0;
                hkml().on($scope.hotKey, function(markup, status){
                    if(status){
                        console.log(markup);
                        $scope.$apply(function(){
                            $scope.count++;
                        });
                        $element
                            .removeClass('hkml-js-tester-animated');
                        setTimeout(function(){
                            $element.addClass('hkml-js-tester-animated');
                        }, 1);
                    }
                });
            }
        }
    });