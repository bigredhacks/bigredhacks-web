let app = angular.module('brh.controllers', []);

app.controller('checkin.ctrl', ['$scope', '$http', function ($scope, $http) {
    $scope.users = [];
    $scope.inputSearch = "";
    $scope.filterSearch = function (user) {
        let input = $scope.inputSearch.toLowerCase();
        let name = (user.name.first + " " + user.name.last).toLowerCase();
        return (input == "" || name.indexOf(input) != -1);
    };
    $scope.noFilter = true;
    $scope.filterCheckedIn = function (user) {
        if ($scope.noFilter) return true;
        return !user.internal.checkedin;
    };
    $scope.toggleFilter = function () {
        $scope.noFilter = !$scope.noFilter;
    }

    $scope.loadUsers = function () {
        $http.get('/api/admin/users/checkin')
            .success(function (data, status, headers, config) {
                $scope.users = data;
                console.log("Got users", data);
            })
            .error(function (data, status, headers, config) {
                console.log("Failed getting users", data, status, headers);
            });
    };

    $scope.checkinUser = function (pubid) {
        $http({
            method: 'PATCH',
            url: '/api/admin/user/' + pubid + '/checkin',
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                checkedin: true
            }
        }).success(function (data) {
            $scope.loadUsers();
        }).error(function () {
            console.log("Error checking user in");
        });
    };

    $scope.loadUsers();
}]);