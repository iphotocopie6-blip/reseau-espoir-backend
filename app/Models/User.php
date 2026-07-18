<?php
namespace App\Models;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
class User extends Authenticatable {
  use HasApiTokens;
  protected $fillable = ['nom','prenom','phone','email','commune','password','code_perso','code_parrain','device_id','points','solde','niveau','is_active'];
  protected $hidden = ['password'];
  public static function generateCodePerso() {
    do { $code = 'EC' . rand(100000, 999999); } while (self::where('code_perso',$code)->exists());
    return $code;
  }
  public function updateNiveau() {
    $count = $this->filleuls_count;
    if ($count >= 500) $this->niveau = 'Ambassadeur';
    elseif ($count >= 151) $this->niveau = 'Diamant';
    elseif ($count >= 51) $this->niveau = 'Platine';
    elseif ($count >= 21) $this->niveau = 'Or';
    elseif ($count >= 6) $this->niveau = 'Argent';
    else $this->niveau = 'Bronze';
    $this->save();
  }
}
